#!/usr/bin/env node
// AI kit: из отчётов Playwright (JSON) — шаг CI без ИИ (spec/05 §6, §7):
//   flaky test → issue `flaky-test` в GitHub Issues (одна issue на тест; комментарий на каждый случай);
//   тест в quarantine (`@quarantine #<issue> до …`) → итог прогона комментарием в его issue;
//   в GitHub Actions — аннотация «ai-kit e2e tests» с числом выполненных тестов: watch берёт из неё число тестов full (M5).
//   node .github/ai-team/flaky-report.mjs <отчёт.json>…
// Пути тестов — от корня репозитория (как у gate), чтобы issue одного теста не двоились.
// Дубли отсекаются ключом «тест + прогон». Трекер не GitHub Issues или нет доступа — «не записаны: нет доступа».
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { relative, resolve } from "node:path";

const files = process.argv.slice(2).filter((f) => existsSync(f));
const flaky = [], quarantined = [];
let executed = 0, parsed = 0;
const cwd = (() => { try { return realpathSync(process.cwd()); } catch { return process.cwd(); } })();
const repoPath = (root, file) => {
  if (!root || !file) return file;
  let abs = resolve(root, file);
  try { abs = realpathSync(abs); } catch { /* файла нет на этой машине — как есть */ }
  const r = relative(cwd, abs);
  return r.startsWith("..") ? file : r;
};
const outcomeOf = (t) => (t.results ?? []).map((r) => (r.status === "passed" ? "зелёный" : r.status === "skipped" ? "пропущен" : "красный")).join(" → ") || t.status;
function walk(suite, file, root) {
  for (const s of suite.suites ?? []) walk(s, s.file || file, root);
  for (const spec of suite.specs ?? []) {
    const path = repoPath(root, spec.file || file);
    const q = /@quarantine\s+#(\d+)/.exec(`${spec.title} ${(spec.tags ?? []).join(" ")}`);
    for (const t of spec.tests ?? []) {
      if (t.status !== "skipped") executed++;
      const row = { file: path, line: spec.line, title: spec.title, project: t.projectName, outcome: outcomeOf(t), status: t.status };
      if (q) { if (t.status !== "skipped") quarantined.push({ ...row, issue: q[1] }); continue; }
      if (t.status === "flaky") flaky.push(row);
    }
  }
}
for (const f of files) {
  try { const rep = JSON.parse(readFileSync(f, "utf8")); walk(rep, "", rep.config?.rootDir); parsed++; } catch (e) { console.log(`flaky-report: не разобрал ${f}: ${e.message}`); }
}
// Число выполненных тестов этой части — аннотацией job (читает watch: gh api …/check-runs/<job>/annotations).
if (parsed && process.env.GITHUB_ACTIONS) console.log(`::notice title=ai-kit e2e tests::${executed}`);
if (!flaky.length && !quarantined.length) { console.log("flaky: нет; quarantine: не гонялся"); process.exit(0); }

const overlay = existsSync("ai-team-docs/config/project-overlay.md") ? readFileSync("ai-team-docs/config/project-overlay.md", "utf8") : "";
const tracker = (/^\|\s*issue_tracker\s*\|\s*([^|]+?)\s*\|/m.exec(overlay)?.[1] ?? "github-issues").replace(/^<(.*)>$/, "$1");
if (tracker !== "github-issues" || !process.env.GH_TOKEN) {
  console.log(`flaky и quarantine не записаны: нет доступа (трекер ${tracker}${process.env.GH_TOKEN ? "" : ", нет GH_TOKEN"}). Flaky: ${flaky.length}, quarantine: ${quarantined.length}`);
  for (const t of flaky) console.log(`- ${t.file}:${t.line} › ${t.title} (${t.outcome})`);
  for (const t of quarantined) console.log(`- quarantine #${t.issue}: ${t.file}:${t.line} › ${t.title} (${t.outcome})`);
  process.exit(0);
}

const gh = (...a) => execFileSync("gh", a, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const run = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
const pr = process.env.GITHUB_EVENT_NAME === "pull_request" ? `#${(process.env.GITHUB_REF ?? "").split("/")[2]}` : process.env.GITHUB_EVENT_NAME === "schedule" ? "ночной прогон" : process.env.GITHUB_EVENT_NAME;
const keyOf = (t) => `${process.env.GITHUB_RUN_ID}:${process.env.GITHUB_RUN_ATTEMPT ?? 1}:${t.file}:${t.line}:${t.project ?? ""}`;
const commentOnce = (issue, key, body) => {
  const comments = JSON.parse(gh("issue", "view", String(issue), "--json", "comments")).comments ?? [];
  if (comments.some((c) => c.body.includes(key))) return false;
  gh("issue", "comment", String(issue), "--body", body);
  return true;
};
const today = new Date().toISOString().slice(0, 10);

if (flaky.length) spawnSync("gh", ["label", "create", "flaky-test", "--color", "D93F0B", "--description", "AI kit: нестабильный тест"], { stdio: "ignore" });
for (const t of flaky) {
  const name = `${t.file}:${t.line} › ${t.title}`;
  const key = `ai-team-flaky-key: ${keyOf(t)}`;
  try {
    const found = JSON.parse(gh("issue", "list", "--label", "flaky-test", "--state", "all", "--search", `"${t.file}:${t.line}" in:title`, "--json", "number,title,state", "--limit", "5")).find((i) => i.title.includes(`${t.file}:${t.line}`));
    const body = `**${today}** · ${pr} · ${t.outcome} · источник: CI${t.project ? ` (${t.project})` : ""} · [прогон](${run})\n\n<!-- ${key} -->`;
    if (!found) {
      gh("issue", "create", "--title", `flaky: ${name}`.slice(0, 250), "--label", "flaky-test", "--body", `Нестабильный тест (AI kit, spec/05 §7). История случаев — комментариями.\n\n${body}`);
      console.log(`flaky: заведена issue — ${name}`);
      continue;
    }
    if (found.state === "CLOSED") gh("issue", "reopen", String(found.number));
    if (commentOnce(found.number, key, body)) console.log(`flaky: #${found.number} — ${name}`);
  } catch (e) {
    console.log(`flaky не записан (${name}): ${String(e.stderr || e.message).split("\n")[0]}`);
  }
}
// Quarantine: итог каждого прогона — в issue из метки (spec/05 §6), и зелёный, и красный.
for (const t of quarantined) {
  const key = `ai-team-quarantine-key: ${keyOf(t)}`;
  const body = `quarantine · **${today}** · ${pr} · ${t.status === "expected" ? "зелёный" : t.outcome} · ${t.file}:${t.line} › ${t.title}${t.project ? ` (${t.project})` : ""} · [прогон](${run})\n\n<!-- ${key} -->`;
  try { if (commentOnce(t.issue, key, body)) console.log(`quarantine: #${t.issue} — ${t.title}: ${t.outcome}`); }
  catch (e) { console.log(`quarantine не записан (#${t.issue}): ${String(e.stderr || e.message).split("\n")[0]}`); }
}

#!/usr/bin/env node
// AI kit: from Playwright reports (JSON) — a CI step without AI (spec/05 §6, §7):
//   a flaky test → an issue `flaky-test` in GitHub Issues (one issue per test; a comment for each occurrence);
//   a test in quarantine (`@quarantine #<issue> until …`) → the run result as a comment in its issue;
//   in GitHub Actions — the annotation «ai-kit e2e tests» with the number of executed tests: watch takes the number of full tests from it (M5).
//   node .github/ai-team/flaky-report.mjs <report.json>…
// Test paths are from the repository root (as in the gate), so that the issues of one test are not doubled.
// Duplicates are cut by the key «test + run». The tracker is not GitHub Issues or there is no access — «not recorded: no access».
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { relative, resolve } from "node:path";

// The hosting is one place: every call to the tracker and the hosting below goes through host. Another hosting changes only this object
// (the script runs in the project's CI without AI kit). Here — GitHub, through gh.
function hostGithub() {
  const gh = (...a) => execFileSync("gh", a, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return {
    labelCreate: (name, color, description) => spawnSync("gh", ["label", "create", name, "--color", color, "--description", description], { stdio: "ignore" }),
    issueComments: (issue) => JSON.parse(gh("issue", "view", String(issue), "--json", "comments")).comments ?? [],
    issueComment: (issue, body) => gh("issue", "comment", String(issue), "--body", body),
    issueFind: (label, search) => JSON.parse(gh("issue", "list", "--label", label, "--state", "all", "--search", search, "--json", "number,title,state", "--limit", "5")),
    issueCreate: (title, label, body) => gh("issue", "create", "--title", title, "--label", label, "--body", body),
    issueReopen: (issue) => gh("issue", "reopen", String(issue)),
  };
}

const files = process.argv.slice(2).filter((f) => existsSync(f));
const flaky = [], quarantined = [];
let executed = 0, parsed = 0;
const cwd = (() => { try { return realpathSync(process.cwd()); } catch { return process.cwd(); } })();
const repoPath = (root, file) => {
  if (!root || !file) return file;
  let abs = resolve(root, file);
  try { abs = realpathSync(abs); } catch { /* the file is not on this machine — as is */ }
  const r = relative(cwd, abs);
  return r.startsWith("..") ? file : r;
};
const outcomeOf = (t) => (t.results ?? []).map((r) => (r.status === "passed" ? "green" : r.status === "skipped" ? "skipped" : "red")).join(" → ") || t.status;
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
  try { const rep = JSON.parse(readFileSync(f, "utf8")); walk(rep, "", rep.config?.rootDir); parsed++; } catch (e) { console.log(`flaky-report: could not parse ${f}: ${e.message}`); }
}
// The number of tests executed in this part — as a job annotation (watch reads it: gh api …/check-runs/<job>/annotations).
if (parsed && process.env.GITHUB_ACTIONS) console.log(`::notice title=ai-kit e2e tests::${executed}`);
if (!flaky.length && !quarantined.length) { console.log("flaky: none; quarantine: did not run"); process.exit(0); }

const overlay = existsSync("ai-team-docs/config/project-overlay.md") ? readFileSync("ai-team-docs/config/project-overlay.md", "utf8") : "";
const tracker = (/^\|\s*issue_tracker\s*\|\s*([^|]+?)\s*\|/m.exec(overlay)?.[1] ?? "github-issues").replace(/^<(.*)>$/, "$1");
if (tracker !== "github-issues" || !process.env.GH_TOKEN) {
  console.log(`flaky and quarantine not recorded: no access (tracker ${tracker}${process.env.GH_TOKEN ? "" : ", no GH_TOKEN"}). Flaky: ${flaky.length}, quarantine: ${quarantined.length}`);
  for (const t of flaky) console.log(`- ${t.file}:${t.line} › ${t.title} (${t.outcome})`);
  for (const t of quarantined) console.log(`- quarantine #${t.issue}: ${t.file}:${t.line} › ${t.title} (${t.outcome})`);
  process.exit(0);
}

const host = hostGithub();
const run = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
const pr = process.env.GITHUB_EVENT_NAME === "pull_request" ? `#${(process.env.GITHUB_REF ?? "").split("/")[2]}` : process.env.GITHUB_EVENT_NAME === "schedule" ? "nightly run" : process.env.GITHUB_EVENT_NAME;
const keyOf = (t) => `${process.env.GITHUB_RUN_ID}:${process.env.GITHUB_RUN_ATTEMPT ?? 1}:${t.file}:${t.line}:${t.project ?? ""}`;
const commentOnce = (issue, key, body) => {
  const comments = host.issueComments(issue);
  if (comments.some((c) => c.body.includes(key))) return false;
  host.issueComment(issue, body);
  return true;
};
const today = new Date().toISOString().slice(0, 10);

if (flaky.length) host.labelCreate("flaky-test", "D93F0B", "AI kit: unstable test");
for (const t of flaky) {
  const name = `${t.file}:${t.line} › ${t.title}`;
  const key = `ai-team-flaky-key: ${keyOf(t)}`;
  try {
    const found = host.issueFind("flaky-test", `"${t.file}:${t.line}" in:title`).find((i) => i.title.includes(`${t.file}:${t.line}`));
    const body = `**${today}** · ${pr} · ${t.outcome} · source: CI${t.project ? ` (${t.project})` : ""} · [run](${run})\n\n<!-- ${key} -->`;
    if (!found) {
      host.issueCreate(`flaky: ${name}`.slice(0, 250), "flaky-test", `Unstable test (AI kit, spec/05 §7). The history of occurrences — in comments.\n\n${body}`);
      console.log(`flaky: issue created — ${name}`);
      continue;
    }
    if (found.state === "CLOSED") host.issueReopen(found.number);
    if (commentOnce(found.number, key, body)) console.log(`flaky: #${found.number} — ${name}`);
  } catch (e) {
    console.log(`flaky not recorded (${name}): ${String(e.stderr || e.message).split("\n")[0]}`);
  }
}
// Quarantine: the result of every run — into the issue from the tag (spec/05 §6), green and red alike.
for (const t of quarantined) {
  const key = `ai-team-quarantine-key: ${keyOf(t)}`;
  const body = `quarantine · **${today}** · ${pr} · ${t.status === "expected" ? "green" : t.outcome} · ${t.file}:${t.line} › ${t.title}${t.project ? ` (${t.project})` : ""} · [run](${run})\n\n<!-- ${key} -->`;
  try { if (commentOnce(t.issue, key, body)) console.log(`quarantine: #${t.issue} — ${t.title}: ${t.outcome}`); }
  catch (e) { console.log(`quarantine not recorded (#${t.issue}): ${String(e.stderr || e.message).split("\n")[0]}`); }
}

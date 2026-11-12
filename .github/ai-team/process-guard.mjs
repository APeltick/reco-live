#!/usr/bin/env node
// Process guard of the AI kit — checks of the process rules in the project repository (spec/03 §2, spec/04 §5, spec/05 §6, spec/13).
// It lives in the project's git: works in CI and in gate without the AI kit installed. Node ≥ 22 only, no dependencies; decisions
// (ADR and ATD) are checked by the logic of decisions.mjs next to it — a copy of utils/decisions.mjs of the AI kit, also in the project's git.
//
//   node .github/ai-team/process-guard.mjs [--base <ref>] [--head <ref>] [--pr-body <file>] [--all]
//   node .github/ai-team/process-guard.mjs adr-index [--write | --check]       decision indexes: project ADR (with the adr rule) and ATD
//   node .github/ai-team/process-guard.mjs adr-bundle [--out <file>] [--head <ref>]   active ADR and ATD as one text (review-adr)
//   node .github/ai-team/process-guard.mjs e2e-targets [--base <ref>] [--pr-body <file>] [--regex]   targeted e2e files for CI
//
// --base     what to compare with (default origin/$GITHUB_BASE_REF or the integration branch from the project overlay)
// --head     what to check (default the working copy; gate passes the head of one PR — then files are read from it too)
// --pr-body  file with the PR description (or the PR_BODY variable) — for the checks of the PR template fields and Tasks:
// --all      check the test line rules (skip, sleeps, serial, locators) in all tests, not only in new lines
// An exception from the test line rules — «reason: <why>» in the same line or the line above.
// Rules are switched on in ai-team-docs/config/project-overlay.md → process-guard.
//
// Language (DEC-0105 §2.7): messages and the PR template are English; the reader accepts the old Russian form of every line it
// reads too (compat) — PR descriptions, test labels and overlays are written by any AI kit version of any team member.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const USAGE = `process guard of the AI kit — process rules in the project repository (spec/05 §6, spec/13 of the AI kit).

  node .github/ai-team/process-guard.mjs [--base <ref>] [--head <ref>] [--pr-body <file>] [--all]
  node .github/ai-team/process-guard.mjs adr-index [--write | --check]
  node .github/ai-team/process-guard.mjs adr-bundle [--out <file>] [--head <ref>]
  node .github/ai-team/process-guard.mjs e2e-targets [--base <ref>] [--pr-body <file>] [--head <ref>] [--regex]`;
// Commands and their flags (T9): an unknown word or flag — a hint and a refusal, nothing is checked.
const COMMANDS = {
  "": { values: ["base", "head", "pr-body"], flags: ["all"] },
  "adr-index": { values: [], flags: ["write", "check"] },
  "adr-bundle": { values: ["out", "head"], flags: [] },
  "e2e-targets": { values: ["base", "pr-body", "head"], flags: ["regex"] },
};
{
  const a = process.argv.slice(2);
  if (a.includes("-h") || a.includes("--help")) { console.log(USAGE); process.exit(0); }
  const cmd = a[0] && !a[0].startsWith("-") ? a[0] : "";
  const spec = COMMANDS[cmd];
  const bad = (why) => { console.error(`process guard: ${why}\n\n${USAGE}`); process.exit(2); };
  if (!spec) bad(`unknown command «${cmd}»`);
  for (let i = cmd ? 1 : 0; i < a.length; i++) {
    const f = a[i].startsWith("--") ? a[i].slice(2) : null;
    if (f !== null && spec.flags.includes(f)) continue;
    if (f !== null && spec.values.includes(f)) { if (a[i + 1] === undefined) bad(`--${f}: a value is needed`); i++; continue; }
    bad(f !== null ? `unknown flag ${a[i]}${cmd ? ` of ${cmd}` : ""}` : `extra word «${a[i]}»`);
  }
  if (cmd === "adr-index" && a.includes("--write") && a.includes("--check")) bad("adr-index: --write or --check, not both");
}

const ROOT = (() => { try { return execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim(); } catch { return process.cwd(); } })();
// core.quotePath=false — paths with non-ASCII letters come as they are, not in quotes with \NNN.
const git = (...a) => { try { return execFileSync("git", ["-C", ROOT, "-c", "core.quotePath=false", ...a], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] }); } catch { return ""; } };
// A submodule in the diff file list is always visible: otherwise `ignore = all` from .gitmodules of the PR (in CI — of the working copy) hides the gitlink, and the file «did not change».
const IGN = "--ignore-submodules=none";
const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
// What is checked: the working copy (HEAD) or the head of one PR — then all files are read from it (gate, merge group).
const HEAD = opt("head") || "HEAD";
const read = (p) => (HEAD === "HEAD" ? (existsSync(join(ROOT, p)) ? readFileSync(join(ROOT, p), "utf8") : "") : git("show", `${HEAD}:${p}`));
// The working copy — with files not yet added to git (a check before the commit), the head of a PR — its tree.
const lsFiles = (...paths) => (HEAD === "HEAD" ? git("ls-files", "--cached", "--others", "--exclude-standard", "--", ...paths) : git("ls-tree", "-r", "--name-only", HEAD, "--", ...paths)).split("\n").filter(Boolean);

// phrases:begin — a copy of DEC-0105 §2.7 from scripts/lib/phrases.mjs of the AI kit (the process guard lives in the project's git
// and does not import AI kit modules). en — the form the PR template writes and the messages name; ru — the old form, still read
// (compat): PR descriptions, test labels and overlays written by an older AI kit stay green. tests/process-guard.test.mjs of the
// AI kit checks that the copy is the same.
const PR_SECTIONS = [{ en: "Conflicts", ru: "Конфликты" }, { en: "Decisions beyond the requirement", ru: "Решения сверх requirement" }];
const APPROVAL_LABEL = { en: "Change approved", ru: "Change утвердил" };
const ADR_PENDING = { en: "ADR takes effect after merge", ru: "ADR вступит в силу после влития" };
const WHY_NOT_LOWER = { en: "why not lower", ru: "не ниже" };
const WHY_NOT_STEP = { en: "why not a step", ru: "не шагом" };
const QUARANTINE_UNTIL = { en: "until", ru: "до" };
const REASON_WORD = { en: "reason", ru: "причина" };
const RULE_ON = { en: ["yes", "on"], ru: ["да"] };
// phrases:end
/** Both forms of a phrase as a regex group; a space matches any run of spaces. */
const either = (e) => `(?:${[e.en, e.ru].map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+")).join("|")})`;

// ---------- project overlay (the same format the AI kit reads: «## id» + one table) ----------
function sections(text) {
  const out = {};
  let id = "_"; // the table before the first «## id» (for example, in AREAS.md)
  for (const line of text.replace(/<!--[\s\S]*?-->/g, "").split("\n")) {
    const h = /^##\s+([\w-]+)\s*$/.exec(line);
    if (h) { id = h[1]; continue; }
    if (!id || !line.trim().startsWith("|")) continue;
    const cells = line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim().replace(/`/g, ""));
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
    if (!out[id]) { out[id] = { header: cells, rows: [] }; continue; }
    out[id].rows.push(Object.fromEntries(out[id].header.map((k, i) => [k, cells[i] === "—" ? "" : (cells[i] ?? "")])));
  }
  return out;
}
let overlay = sections(read("ai-team-docs/config/project-overlay.md"));
const kv = (sec, k = sec?.header?.[0], v = sec?.header?.[1]) => Object.fromEntries((sec?.rows ?? []).map((r) => [r[k], r[v]]));
const project = kv(overlay.project);
const pathsCfg = kv(overlay.paths, "kind", "globs");
// A list of globs: separated by commas, «;» or spaces; backticks and list markers are dropped (as in the AI kit).
const globsOf = (s) => (s ?? "").split(/[\n,;]+|\s+/).map((x) => x.replace(/`/g, "").trim()).filter((x) => x && !["—", "-", "*", "+"].includes(x));
const RULE_DEFAULTS = {
  "tier-labels": "yes", "tasks-field": "yes", "pr-fields": "yes", adr: "yes", quarantine: "yes", "skip-reason": "yes", "no-wait-timeout": "no", "bare-refs": "no", "specs-archive-only": "no",
  // DEC-0049, DEC-0055, DEC-0065, DEC-0066, DEC-0068.
  "e2e-no-browser": "yes", "no-sleep": "yes", "no-serial": "yes", "forbidden-locators": "yes", "test-layers": "yes", "change-approved": "yes", "adr-human-merge": "yes", "team-docs-map": "yes",
  "people-ids": "yes", // ids in roles.md → people — without repeats (case-insensitive): one id — one AI team
};
// Own rules — the process-guard section of the project overlay. A PR check takes them from the base (below, after --base): a PR
// that switches a rule off is still checked by it — the new value acts after merge. Commands without a base — from the working copy.
let rules = { ...RULE_DEFAULTS, ...kv(overlay["process-guard"], "rule", "on") };
// A rule is on: «yes» / «on»; the human's Russian word of RULE_ON in an overlay too (human-words).
const RULE_ON_RE = new RegExp(`^(?:${[...RULE_ON.en, ...RULE_ON.ru].join("|")})$`, "i");
const on = (r) => RULE_ON_RE.test(rules[r] ?? "");

function globRe(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") { if (glob[i + 2] === "/") { re += "(?:.*/)?"; i += 2; } else { re += ".*"; i += 1; } }
    else if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}
const matches = (globs, p) => globs.some((g) => globRe(g).test(p) || (!/[*?]/.test(g) && p.startsWith(g.replace(/\/$/, "") + "/")) || (!g.includes("/") && globRe(g).test(basename(p))));

// ---------- result ----------
const problems = [], notes = [];
const fail = (rule, text) => problems.push(`[${rule}] ${text}`);

// ---------- decisions: project ADR and ATD (DEC-0049, DEC-0091) ----------
// One model: a file «as decided now» (<ID>-<slug>.md) and its history history/<the same file>, the number is forever, statuses
// «active» / «revoked». The index and the checks — decisions.mjs next to it (a copy of utils/decisions.mjs of the AI kit).
// ADRs that the project kept by the standard (NNNN-<slug>.md, Accepted / Superseded) stay as they are: the index understands them.
// decision-paths:begin — a copy of scripts/lib/decision-paths.mjs of the AI kit (the process guard in the project's git does not
// import AI kit modules): the ADR folder from the project overlay and «file — decision». tests/process-guard.test.mjs of the AI kit checks they are the same.
const ATD_DIR = "ai-team-docs/atd";
const LEGACY_ATD_DIR = "ai-team-docs/adr"; // before DEC-0091 the «ADRs about the work of the AI team» lay here
const DEFAULT_ADR_DIR = "docs/adr";
const TEMPLATE_NAMES = ["0000-template.md", "ADR-0000-template.md", "ATD-0000-template.md"];
const AUX_NAMES = ["README.md", "areas.md", "AREAS.md"]; // the index and the old list of ADR areas (the AI kit put it before DEC-0091)
function projectAdrDir(value, fallback = DEFAULT_ADR_DIR) {
  const first = String(value ?? "").replace(/`/g, "").split(/[\n,;]+|\s+/).map((s) => s.trim()).find((s) => s && !["—", "-", "*", "+"].includes(s)) ?? "";
  if (/[<>]/.test(first)) return fallback;
  const dir = first.replace(/^(?:\.\/)+/, "").replace(/\/+$/, "");
  return dir && dir !== "." ? dir : fallback;
}
function isDecisionFile(file, dirs, { history = true } = {}) {
  const f = String(file ?? "").replace(/^(?:\.\/)+/, "");
  return dirs.some((d) => {
    if (!d || !f.startsWith(`${d}/`)) return false;
    const rel = f.slice(d.length + 1);
    if (!rel || AUX_NAMES.includes(rel) || TEMPLATE_NAMES.includes(rel)) return false;
    return history || !rel.startsWith("history/");
  });
}
// decision-paths:end
// The paths configurations the rule data is read by: without a base — one (the working copy); in a PR check — the base and the
// head of the PR (useBaseData). The strict side of the data (checks more) — from both at once; the permissive one (WEAKENING,
// «where e2e may be declared») — only from the base.
let pathsList = [pathsCfg];
let pathsWeak = [pathsCfg]; // configurations for the permissive data: with an overlay in the base — only the base
let ADR_DIRS = [projectAdrDir(pathsCfg.adr_dir)]; // project ADR folders: the first one — the main one (base), the next — only from the PR head
let PROJECT_ADR = ADR_DIRS[0];
// rule — under which rule a violation goes: project ADR — the adr rule (off for a project with its own ADR format, keep-own);
// ATD — the AI team's own decisions, always checked.
const adrSet = (dir) => ({ prefix: "ADR", dir, title: "project ADR", head: "Project decisions (ADR)", rule: "adr" });
const SETS = [
  adrSet(PROJECT_ADR),
  { prefix: "ATD", dir: ATD_DIR, title: "ATD — decisions about the work of the AI team", head: "Decisions about the work of the AI team (ATD)", rule: "atd" },
];
// A change of a decision (DEC-0065, DEC-0091) — a file in the decision folders (and in the old ai-team-docs/adr): the decision,
// its history, an ADR of the project's own format (P10: log4brains, «adr-012-…», .markdown, MADR «0000-use-markdown-…»), a removal
// and a move out of the folder. AI kit helper files — the index (README.md of the folder) and the template (0000-template.md,
// ADR-/ATD-0000-template.md) — are not a decision (I1). The rule is one with the AI kit (the installer puts the line «ADR takes
// effect after merge» into its PR by it; gate, merge and the watchdog — «the human merges»).
const isAdrDoc = (f) => isDecisionFile(f, [...ADR_DIRS, ATD_DIR, LEGACY_ATD_DIR]);

// The decision logic — in decisions.mjs next to it; it is missing (the process guard was updated without it) — the adr rule is
// red, the rest goes on. The address — via a URL, not the string «./decisions.mjs»: the static module graph of the AI kit does not
// count the probe as an edge core → option (decisions — an option, the process guard — core; no file — not a build error, but the adr rule).
let D = null;
try { D = await import(new URL("./decisions.mjs", import.meta.url).href); } catch { /* the adr rule will say */ }
const NO_DECISIONS = "no .github/ai-team/decisions.mjs next to the process guard — decisions cannot be checked: update the AI kit (`node <AI kit>/installer/apply.mjs update`) or copy utils/decisions.mjs of the AI kit";
// Read a folder: the working copy or the tree of a ref (the PR head, the merge-base).
const readerOf = (dir, ref = HEAD) => (ref === "HEAD" ? D.fsReader(join(ROOT, dir)) : D.gitReader(join(ROOT, dir), ref));
const INDEX_CMD = "ai-team adr-index (or node .github/ai-team/process-guard.mjs adr-index --write)";

/** README of a set, if there is none: the heading, how it works, the index markers. */
const skeleton = (set) => [
  `# ${set.head}`, "",
  `The index is built by a script — ${INDEX_CMD}; do not edit it by hand, do not resolve a git conflict in it — rebuild it. A decision — a file \`${set.prefix}-NNNN-<slug>.md\` («as decided now»), its history — \`history/<the same file>\`, newest entries first. The next number — \`ai-team adr-next${set.prefix === "ATD" ? " --atd" : ""}\`.`, "",
  "<!-- decisions-index:begin -->", "<!-- decisions-index:end -->", "",
].join("\n");

/**
 * Decisions: template, history, numbers (a repeat — only for new files of the PR, K21), removal, links, index.
 * sets — which sets to check (project ADR — if the adr rule is on; ATD — always).
 */
function checkDecisions(base, sets) {
  if (!sets.length) return;
  if (!D) { for (const set of sets) if (set.rule === "adr" || lsFiles(set.dir).length) fail(set.rule, NO_DECISIONS); return; }
  let mb = null;
  try {
    // Links are resolved over both sets, even if one of them is not checked.
    // (there may be two ADR folders — the base and the PR head, see useBaseData: links go to the one that has decisions)
    const readers = Object.fromEntries(SETS.map((st) => [st.dir, readerOf(st.dir)]));
    const linkTarget = (prefix) => { const own = SETS.filter((x) => x.prefix === prefix); return (own.find((x) => lsFiles(x.dir).length) ?? own[0]).dir; };
    if (base) mb = D.mergeBase(ROOT, base, HEAD);
    for (const set of sets) {
      const links = Object.fromEntries([...new Set(SETS.filter((x) => x.prefix !== set.prefix).map((x) => x.prefix))].map((p) => [p, readers[linkTarget(p)]]));
      const r = D.checkFolder({ reader: readers[set.dir], prefix: set.prefix, baseReader: mb ? readerOf(set.dir, mb) : null, baseRef: base, linkReaders: links, dupes: "new" });
      for (const e of r.errors) fail(set.rule, `${set.dir}/${e.file}: ${e.text}`);
      // DEC — decisions of the AI kit: a project has none, links to them cannot be checked (the note of decisions.mjs, any language).
      for (const n of r.notes) if (!/\bDEC-NNNN\b/.test(n)) notes.push(`⚠️ ${set.dir}: ${n}`);
      if (!r.count) continue; // no decisions — the index is not checked
      const rel = `${set.dir}/README.md`;
      const existing = read(rel) || null;
      const text = existing === null ? null : D.buildReadme(existing, set.prefix, r.decisions);
      if (existing === null) fail(set.rule, `${rel}: no index — build it: ${INDEX_CMD}`);
      else if (text === null) fail(set.rule, `${rel}: no index markers (<!-- decisions-index:begin --> … <!-- decisions-index:end -->)`);
      else if (text !== existing) fail(set.rule, `index ${rel} is stale — rebuild it: ${INDEX_CMD}; do not resolve a conflict in the index by hand on rebase — rebuild it`);
    }
  } catch (e) { fail(sets[0].rule, `decisions cannot be read: ${String(e.message).split("\n")[0]}`); }
}

/**
 * A new file in the old folder ai-team-docs/adr/ (I22): ATD since DEC-0091 — in ai-team-docs/atd/ (the AI kit update moved the
 * folder). This is how someone with an old AI kit writes: without this check their PR is red only by the ai-team-docs map — unclear why.
 */
function checkLegacyAtdDir(base) {
  if (!base) return;
  const added = git("diff", IGN, "--no-renames", "--name-only", "--diff-filter=A", `${base}...${HEAD}`, "--", `${LEGACY_ATD_DIR}/`).split("\n").filter(Boolean);
  for (const f of added) fail("atd", `${f}: decisions about the work of the AI team are now in ${ATD_DIR}/ (ATD-NNNN-<slug>.md, DEC-0091) — update the AI kit (installer/INSTALL.md, the «update» mode), the number — ai-team adr-next --atd, and put the decision there`);
}

/**
 * Rebuild the indexes (adr-index --write): a git conflict inside the index block goes away with the old block text.
 * Conflict markers in the decision files themselves and their history (of all sets) — a refusal before the build: the index would be built from garbage.
 */
function writeIndexes(sets) {
  const conflicts = sets.flatMap((set) => D.conflictFiles(D.fsReader(join(ROOT, set.dir)), set.prefix).map((c) => join(set.dir, c)));
  if (conflicts.length) { console.error(`the index is not built: git conflict markers (<<<<<<<, >>>>>>>) are left in decision files: ${conflicts.join(", ")} — resolve the conflict and repeat`); return 1; }
  let bad = 0;
  for (const set of sets) {
    const f = join(ROOT, set.dir, "README.md");
    const existing = existsSync(f) ? readFileSync(f, "utf8") : null;
    const { decisions } = D.loadFolder(D.fsReader(join(ROOT, set.dir)), set.prefix);
    const text = D.buildReadme(existing ?? skeleton(set), set.prefix, decisions);
    if (text === null) { console.error(`${set.dir}/README.md: no index markers <!-- decisions-index:begin --> … <!-- decisions-index:end --> — put them where the index should be`); bad++; continue; }
    if (/^(<{7}|={7}|>{7})( |$)/m.test(text)) { console.error(`${set.dir}/README.md: a git conflict outside the index block — resolve this text by hand, the index rebuilds itself`); bad++; continue; }
    if (text !== existing) { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, text); }
    const revoked = decisions.filter((d) => d.status === "revoked").length;
    console.log(`${set.dir}/README.md: index ${text === existing ? "already fresh" : "updated"} (active ${decisions.length - revoked}, revoked ${revoked}); the next number by this copy — ${D.nextId(set.prefix, decisions)}, with colleagues' open PRs — ai-team adr-next${set.prefix === "ATD" ? " --atd" : ""}`);
  }
  return bad;
}

/** All active decisions of both sets as one text — for a fresh subagent review-adr (DEC-0054): all against all. */
function adrBundle() {
  const parts = ["# Active decisions — project ADR and ATD", "", "Check all against all: contradictions and duplicates. The kind, number and path — in the heading of each.", ""];
  for (const set of SETS) {
    const active = D.loadFolder(readerOf(set.dir), set.prefix).decisions.filter((d) => d.status !== "revoked" && (d.format !== "none" || d.titleId));
    parts.push(`## Set: ${set.title} (${set.dir}) — ${active.length}`, "");
    for (const d of active) parts.push(`### ${set.dir}/${d.file}`, "", d.raw.trim(), "");
  }
  return `${parts.join("\n").trimEnd()}\n`;
}

// ---------- tasks.md ----------
// Line ends — CRLF too: otherwise `.` in TASK_LINE does not reach `$`, and a file from Windows is parsed as «not a single line».
const LINE_END = /\r\n?|[\n\u2028\u2029]/;
const TASK_LINE = /^\s*-\s*\[( |x|X)\]\s+(\d+(?:\.\d+)*)\s+(.*)$/;
const isActiveTasks = (f) => /\/tasks\.md$/.test(f) && !f.includes("/archive/");

/** AI model tier labels — in the tasks.md files this PR changed (without a base — in all active changes). */
function checkTierLabels(base) {
  const files = base ? git("diff", IGN, "--name-only", "--diff-filter=AM", `${base}...${HEAD}`, "--", "openspec/changes").split("\n").filter(isActiveTasks)
    : lsFiles("openspec/changes").filter(isActiveTasks);
  for (const f of files) {
    read(f).split(LINE_END).forEach((line, i) => {
      const m = TASK_LINE.exec(line);
      if (!m) return;
      const n = (m[3].match(/\[(strong|standard|light)\]/g) ?? []).length;
      if (n !== 1) fail("tier-labels", `${f}:${i + 1}: task ${m[2]} — ${n ? "more than one label" : "no label"} of AI model tier ([strong] / [standard] / [light])`);
    });
  }
}

const tasksState = (text) => Object.fromEntries(String(text).split(LINE_END).map((l) => TASK_LINE.exec(l)).filter(Boolean).map((m) => [m[2], m[1] !== " "]));

function checkTasksField(base, head, body) {
  const field = /^Tasks:[ \t]*(.*)$/m.exec(body)?.[1]?.trim() ?? "";
  const declared = new Set(field === "—" || field === "-" || !field ? [] : field.split(/[,\s]+/).map((s) => s.split(":").pop()).filter((s) => /^\d+(\.\d+)*$/.test(s)));
  const checked = new Set(), unchecked = [];
  // «Before» — from the merge-base, not from the base head: other people's checkmarks merged after the branch-off are not ours.
  const mb = git("merge-base", base, head).trim() || base;
  for (const f of git("diff", IGN, "--name-only", "--diff-filter=AM", `${base}...${head}`, "--", "openspec/changes").split("\n").filter(isActiveTasks)) {
    const before = tasksState(git("show", `${mb}:${f}`)), after = tasksState(read(f));
    for (const [t, done] of Object.entries(after)) if (done && !before[t]) checked.add(t);
    for (const [t, done] of Object.entries(before)) if (done && after[t] === false) unchecked.push(`${f}: ${t}`);
  }
  for (const u of unchecked) fail("tasks-field", `someone else's checkmark [x] is removed — ${u}`);
  const miss = [...declared].filter((t) => !checked.has(t)), extra = [...checked].filter((t) => !declared.has(t));
  if (miss.length) fail("tasks-field", `declared in «Tasks:», but [x] is not set in tasks.md: ${miss.join(", ")}`);
  if (extra.length) fail("tasks-field", `[x] is set, but not declared in «Tasks:»: ${extra.join(", ")}`);
}

const PR_FIELDS = ["Tasks", "E2E", "Test layers", "Screenshots", "Proof", "Depends on", "Issue", "Models"];
// The text of a field: its line; for «Proof:» also the lines under it — a fenced block or a list, up to the next field or a heading
// (the proof is often the command output under the line; its lines are not fields or headings inside a fence).
function fieldText(body, f) {
  const lines = body.split("\n");
  const at = lines.findIndex((l) => new RegExp(`^${f}:`).test(l));
  if (at < 0) return null;
  const text = [{ l: lines[at].replace(new RegExp(`^${f}:`), ""), fenced: false }];
  if (f !== "Proof") return text;
  let fence = false;
  for (const l of lines.slice(at + 1)) {
    if (!fence && (PR_FIELDS.some((g) => new RegExp(`^${g}:`).test(l)) || /^#{1,6}\s/.test(l))) break;
    // Fence markers are not text (an empty fence is not a proof); lines inside a fence are text, never a template hint.
    if (/^\s*(```|~~~)/.test(l)) fence = !fence;
    else text.push({ l, fenced: fence });
  }
  return text;
}
function checkPrFields(body) {
  for (const f of PR_FIELDS) {
    const text = fieldText(body, f);
    if (text === null) fail("pr-fields", `no field «${f}:» in the PR description (PR template)`);
    // A template hint: «<…>» in the line, or a line under «Proof:», outside a fence, that is only «<…>» or an HTML comment.
    else if (!text.map((t) => t.l).join("\n").trim() || /<[^>]+>/.test(text[0].l) || text.slice(1).some((t) => !t.fenced && /^\s*(<[^>]+>|<!--.*-->)\s*$/.test(t.l))) fail("pr-fields", `the field «${f}:» is not filled in (— if there is nothing)`);
  }
  // A section in either form: «## Conflicts» or the old Russian heading (compat, PR_SECTIONS).
  for (const h of PR_SECTIONS) if (!new RegExp(`^##\\s+${either(h)}`, "m").test(body)) fail("pr-fields", `no section «## ${h.en}» in the PR description`);
}

// ---------- tests: quarantine, skip, waitForTimeout ----------
const TEST_PLACE = /(^|\/)(tests?|__tests__|e2e|specs?)\/|\.(test|spec|e2e)\.[cm]?[jt]sx?$|_test\.(go|py|rb|exs?)$|(^|\/)test_[^/]+\.py$|_spec\.rb$/;
const CODE = /\.([cm]?[jt]sx?|py|go|rb|rs|java|kt|cs|swift|exs?)$/;
const isTestCode = (f) => TEST_PLACE.test(f) && CODE.test(f); // a README in tests/ is not a test
const SKIP = /\b(?:it|test|describe|context)\.(?:skip|fixme)\b|\b(?:xit|xdescribe|xtest)\s*\(|pytest\.mark\.skip|\bt\.Skip(?:Now|f)?\s*\(/;
// «reason:» or the old Russian word (compat, REASON_WORD); not glued to a word before it (\b does not see a Cyrillic word start).
const REASON = new RegExp(`(?<![\\p{L}\\p{N}_])${either(REASON_WORD)}\\s*:`, "iu");
// The label: «@quarantine #N until YYYY-MM-DD»; the old Russian word with DD.MM.YYYY (compat) and mixed forms too — the word and the date
// format are taken independently: a label half-translated by hand is not a CI failure (DEC-0105 §2.7).
const QUARANTINE = new RegExp(`@quarantine\\s+#(\\d+)\\s+${either(QUARANTINE_UNTIL)}\\s+(?:(\\d{4})-(\\d{2})-(\\d{2})|(\\d{2})\\.(\\d{2})\\.(\\d{4}))`);

function checkQuarantine() {
  const security = globsAll("security_tests");
  const today = new Date().toISOString().slice(0, 10);
  let count = 0;
  const withLabel = new Set(git("grep", "-l", "--fixed-strings", ...(HEAD === "HEAD" ? ["--untracked"] : []), "@quarantine", ...(HEAD === "HEAD" ? [] : [HEAD]), "--").split("\n").filter(Boolean).map((l) => (HEAD === "HEAD" ? l : l.slice(HEAD.length + 1))));
  for (const f of [...withLabel].filter(isTestCode)) {
    const text = read(f);
    text.split("\n").forEach((line, i) => {
      if (!line.includes("@quarantine")) return;
      count++;
      const m = QUARANTINE.exec(line);
      if (!m) { fail("quarantine", `${f}:${i + 1}: the label — «@quarantine #<issue> until YYYY-MM-DD»`); return; }
      const date = m[2] ? `${m[2]}-${m[3]}-${m[4]}` : `${m[7]}-${m[6]}-${m[5]}`;
      if (date < today) fail("quarantine", `${f}:${i + 1}: the quarantine term is over (${date}) — the test blocks again: fix it or extend the term with the human's permission`);
      if (matches(security, f)) fail("quarantine", `${f}:${i + 1}: a security and data isolation test may not be in quarantine`);
    });
  }
  if (count > 3) fail("quarantine", `${count} tests in quarantine — no more than 3 allowed`);
}

/**
 * A line without spaces, with the same quotes and without «;» and «,» — an old line is recognized by it after a formatter
 * (indentation, wrapping in test.step, quotes, semicolons, split into lines or joined into one — G10, N15).
 */
const compact = (t) => t.replace(/\s+/g, "").replace(/["'`]/g, "'").replace(/[;,]/g, "");

/**
 * New lines compared to base (or all test lines with --all): [{ file, line, text, prev }].
 * A line is new only if it was not there: a diff ignoring whitespace changes, and an added line whose text is among the removed
 * test lines of the whole diff (reformatted, split into lines, moved inside the file or to another file) is not new (G10, N15).
 * Removed lines are joined one after another, each match «eats» its piece — one removed line does not excuse two new ones; long
 * lines are matched first. prev — the previous line of the file in the checked head, even if it is old: «reason:» on the line
 * above acts above an old line too (G13).
 */
function addedTestLines(base, head, all) {
  const out = [];
  if (all || !base) {
    for (const f of lsFiles().filter(isTestCode)) read(f).split("\n").forEach((text, i, arr) => out.push({ file: f, line: i + 1, text, prev: i ? arr[i - 1] : "" }));
    return out;
  }
  const diff = git("diff", "--unified=0", "--no-color", "--ignore-space-change", `${base}...${head}`).split("\n");
  // Parsing: «--- »/«+++ » — a file header only before the first «@@» (a removed line «-- x» also starts with «---»).
  const sections = [];
  let cur = null, header = false;
  const path = (l) => (l.endsWith("/dev/null") ? null : l.slice(6).replace(/\t$/, "")); // git ends a path with a space by a tab
  for (const l of diff) {
    if (l.startsWith("diff --git ")) { cur = { file: null, old: null, hunks: [] }; sections.push(cur); header = true; continue; }
    if (!cur) continue;
    if (header && l.startsWith("--- ")) { cur.old = path(l); continue; }
    if (header && l.startsWith("+++ ")) { cur.file = path(l); continue; }
    const h = /^@@ -\d+(?:,\d+)? \+(\d+)/.exec(l);
    if (h) { header = false; cur.hunks.push({ start: Number(h[1]), lines: [] }); continue; }
    if (header || !cur.hunks.length) continue;
    if (l.startsWith("+") || l.startsWith("-")) cur.hunks.at(-1).lines.push(l);
  }
  // Removed test lines of the whole diff (and of removed files) — one after another, without a separator: a line joined by a formatter is found too.
  let pool = "";
  for (const { file, old, hunks } of sections) {
    if (!isTestCode(file ?? old ?? "")) continue;
    for (const hk of hunks) for (const l of hk.lines) if (l.startsWith("-")) pool += compact(l.slice(1));
  }
  const added = [];
  for (const { file, hunks } of sections) {
    if (!file || !isTestCode(file)) continue;
    for (const hk of hunks) {
      let n = hk.start;
      for (const l of hk.lines) {
        if (!l.startsWith("+")) continue;
        added.push({ file, line: n, text: l.slice(1), k: compact(l.slice(1)) });
        n++;
      }
    }
  }
  const old = new Set();
  for (const i of added.map((_, i) => i).filter((i) => added[i].k).sort((x, y) => added[y].k.length - added[x].k.length)) {
    const at = pool.indexOf(added[i].k);
    if (at < 0) continue;
    old.add(i);
    pool = `${pool.slice(0, at)}\u0000${pool.slice(at + added[i].k.length)}`;
  }
  const fileLines = new Map();
  const linesOf = (f) => { if (!fileLines.has(f)) fileLines.set(f, read(f).split("\n")); return fileLines.get(f); };
  added.forEach((a, i) => { if (!old.has(i)) out.push({ file: a.file, line: a.line, text: a.text, prev: a.line > 1 ? linesOf(a.file)[a.line - 2] ?? "" : "" }); });
  return out;
}

function checkSkips(lines) {
  for (const { file, line, text, prev } of lines) if (SKIP.test(text) && !REASON.test(text) && !text.includes("@quarantine") && !REASON.test(prev)) fail("skip-reason", `${file}:${line}: skip / fixme without a reason — add «reason: …» or an issue`);
}
const excused = (text, prev) => REASON.test(text) || REASON.test(prev ?? "");
// Sleeps (DEC-0068): wait for an event or an answer, not for seconds.
const SLEEP = /\bwaitForTimeout\s*\(|\b(?:time\.)?sleep\s*\(|\bThread\.sleep\s*\(|new\s+Promise\s*\(\s*\(?\s*\w*\s*\)?\s*=>\s*setTimeout\s*\(/;
function checkWaits(lines, rule = "no-sleep") {
  for (const { file, line, text, prev } of lines) if (SLEEP.test(text) && !excused(text, prev)) fail(rule, `${file}:${line}: a sleep (waitForTimeout / sleep) — wait for an event or an answer, not for seconds (spec/05); an exception — «reason: …»`);
}
// serial and order dependence: tests must run in any order and in parallel (DEC-0068, DEC-0069).
const SERIAL = /\.describe\.serial\b|\bmode\s*:\s*['"`]serial['"`]|\btest\.describe\.configure\s*\(\s*\{[^}]*serial|@pytest\.mark\.order\b/;
function checkSerial(lines) {
  for (const { file, line, text, prev } of lines) if (SERIAL.test(text) && !excused(text, prev)) fail("no-serial", `${file}:${line}: serial / test order — a test must pass alone and in parallel with others (its own data setup per worker, spec/05); an exception — «reason: …»`);
}
/** Forbidden locators — patterns from the project overlay → forbidden-locators (UI library classes, XPath). */
function checkLocators(lines) {
  const rows = (overlay["forbidden-locators"]?.rows ?? []).filter((r) => r.pattern && !/^<.*>$/.test(r.pattern));
  const res = rows.flatMap((r) => { try { return [{ re: new RegExp(r.pattern), why: r.why || "a forbidden locator" }]; } catch { notes.push(`⚠️ forbidden-locators: the pattern «${r.pattern}» is not a regular expression — skipped`); return []; } });
  if (!res.length) return;
  for (const { file, line, text, prev } of lines) {
    const hit = res.find((x) => x.re.test(text));
    if (hit && !excused(text, prev)) fail("forbidden-locators", `${file}:${line}: ${hit.why} (pattern ${hit.re.source}) — a role, a label or a test id; an exception — «reason: …»`);
  }
}

// ---------- test layers (DEC-0066): e2e — what the human sees and does; without a browser — integration ----------
// For a paths field with two sides the strict side (checks more) is the union of the base and the PR head, the permissive one — the base.
// e2e_dir: the strict side — E2E_DIRS (the union): a file is in e2e if it is in the path of any of them — e2e-no-browser, «it lies in
// e2e — declare e2e», «why not lower» / «why not a step»; a PR does not take a file out of the layer by moving or narrowing the path.
// The permissive side — E2E_OK (the base): e2e may be declared only in the e2e_dir of the base, otherwise a PR would call any folder
// e2e (the integration folder of the base too). A file in e2e and integration at once — e2e (stricter). `integration_dir` and
// `e2e_browser_marker` — from the base entirely (the strict side of integration_dir is not bypassed by the base: the base folders are
// always checked); a union would let a PR add its own marker or integration folder and pass.
const WEAKENING = ["e2e_browser_marker", "integration_dir"];
const cfgsOf = (kind) => (WEAKENING.includes(kind) ? pathsWeak : pathsList);
const dirsIn = (cfgs, kind) => [...new Set(cfgs.map((c) => (globsOf(c[kind])[0] || "").replace(/\/+$/, "")).filter(Boolean))];
const dirsOf = (kind) => dirsIn(cfgsOf(kind), kind);
const globsAll = (kind) => [...new Set(cfgsOf(kind).flatMap((c) => globsOf(c[kind])))];
let E2E_DIRS = dirsOf("e2e_dir"); // the strict side of e2e_dir: the union
let E2E_OK = dirsIn(pathsWeak, "e2e_dir"); // the permissive side of e2e_dir: where e2e may be declared — the base
let INT_DIRS = dirsOf("integration_dir");
const inDir = (dirs, f) => dirs.some((dir) => f === dir || f.startsWith(`${dir}/`));
/** The layer of a file by folders: e2e — by e2eDirs (the strict side — E2E_DIRS, the permissive — E2E_OK), integration — by INT_DIRS. */
const layerOf = (f, e2eDirs = E2E_DIRS) => (inDir(e2eDirs, f) ? "e2e" : inDir(INT_DIRS, f) ? "integration" : "unit");
const layerDirs = (where, e2eDirs = E2E_DIRS) => (where === "e2e" ? e2eDirs.join(", ") : where === "integration" ? INT_DIRS.join(", ") : "outside e2e_dir and integration_dir");
// The start of a Playwright test and its fixtures: test('…', async ({ page }) => …) / test("…", { tag }, async ({ request }) => …).
const TEST_START = /\b(?:test|it)(?:\.only)?\s*\(\s*(['"`]).*?\1\s*,\s*(?:\{[^)]*?\}\s*,\s*)?async\s*\(\s*(\{[^}]*\})?/;
const BROWSER = /\b(page|browser|context)\b/;

/**
 * A new test in e2e_dir without a browser — «not e2e, move it to integration». The browser sign — page / browser / context in the
 * fixtures of a Playwright test; overlay paths.e2e_browser_marker (a regular expression) — on top of them (G14): own Playwright
 * fixtures (adminPage, app) and a sign for other tools (a new file without Playwright-style tests — by the file text).
 */
function checkE2eBrowser(lines, newFiles) {
  if (!E2E_DIRS.length) return;
  // Several signs — separated by commas («|» is not allowed in a table cell): each is a regular expression, any one fits; a sign
  // permits — with an overlay in the base only from the base (WEAKENING).
  const markers = globsAll("e2e_browser_marker");
  // A bad regular expression skips only itself: the rule stays (without this sign it is stricter, not weaker).
  const good = markers.filter((x) => { try { new RegExp(x); return true; } catch { notes.push(`⚠️ e2e_browser_marker «${x}» is not a regular expression — skipped`); return false; } });
  const marker = good.join(", ");
  const re = good.length ? new RegExp(good.map((x) => `(?:${x})`).join("|")) : null;
  const browser = (fixtures) => BROWSER.test(fixtures) || (re ? re.test(fixtures) : false);
  for (const { file, line, text, prev } of lines) {
    if (!inDir(E2E_DIRS, file)) continue;
    const m = TEST_START.exec(text);
    if (!m || excused(text, prev)) continue;
    if (!browser(m[2] ?? "")) fail("e2e-no-browser", `${file}:${line}: an e2e test without page / browser / context${marker ? ` and without the sign ${marker}` : ""} — this is not e2e: a check of the server and the database belongs in integration (spec/05, test layers); an exception — «reason: …»`);
  }
  if (!re) return;
  for (const f of newFiles.filter((x) => inDir(E2E_DIRS, x) && isTestCode(x))) {
    const text = read(f);
    if (text.split("\n").some((l) => TEST_START.test(l))) continue; // Playwright-style tests are checked by fixtures above
    if (!re.test(text) && !REASON.test(text.split("\n").slice(0, 3).join("\n"))) fail("e2e-no-browser", `${f}: no browser sign in e2e (${marker}) — this is not e2e: move it to integration (spec/05, test layers)`);
  }
}

/** A PR field value that may go on in the next lines (up to the next field or section). */
function multiField(body, name) {
  const lines = (body ?? "").split("\n");
  const i = lines.findIndex((l) => new RegExp(`^${name}:`).test(l));
  if (i < 0) return null;
  const out = [lines[i].replace(new RegExp(`^${name}:[ \\t]*`), "")];
  // The next field — an English name or an old Russian one (compat).
  for (const l of lines.slice(i + 1)) { if (/^(##\s|[A-ZА-Я][\wА-Яа-я ]{1,30}:\s)/.test(l) || l.trim() === "") break; out.push(l); }
  return out.join("\n").trim();
}

// «why not lower:» / «why not a step:» of a new e2e; the old Russian forms too (compat).
const NOT_LOWER = new RegExp(`${either(WHY_NOT_LOWER)}\\s*:`, "i");
const NOT_STEP = new RegExp(`${either(WHY_NOT_STEP)}\\s*:`, "i");
/** The PR field «Test layers:» (DEC-0068): each new test file — with a layer; a new e2e — «why not lower: …», a new e2e file — also «why not a step: …». */
function checkTestLayers(body, newFiles, lines) {
  const field = multiField(body, "Test layers");
  const newTests = newFiles.filter(isTestCode);
  // New e2e tests in already existing e2e files — also with an explanation «why not lower».
  const e2eTouched = [...new Set(lines.filter((l) => inDir(E2E_DIRS, l.file) && !newTests.includes(l.file) && TEST_START.test(l.text)).map((l) => l.file))];
  const need = [...newTests, ...e2eTouched];
  if (!need.length) return;
  if (field === null || !field || field === "—" || /<[^>]+>/.test(field)) { fail("test-layers", `the field «Test layers:» is not filled in, but the tests are new: ${need.join(", ")} — each with a layer (unit / integration / e2e), a new e2e — with «${WHY_NOT_LOWER.en}: …» (spec/05)`); return; }
  const at = need.map((f) => ({ f, i: field.indexOf(f) })).filter((x) => x.i >= 0).sort((a, b) => a.i - b.i);
  for (const f of need.filter((x) => field.indexOf(x) < 0)) fail("test-layers", `Test layers: no file ${f} — the path and the layer`);
  for (const [k, { f, i }] of at.entries()) {
    const seg = field.slice(i + f.length, k + 1 < at.length ? at[k + 1].i : undefined);
    const layer = /\b(unit|integration|e2e|smoke)\b/i.exec(seg)?.[1]?.toLowerCase();
    if (!layer) { fail("test-layers", `Test layers: ${f} has no layer (unit / integration / e2e)`); continue; }
    const where = layerOf(f); // the strict side: in e2e by the union — declare e2e
    const norm = layer === "smoke" ? "e2e" : layer;
    const mismatch = where === "e2e" ? norm !== "e2e" : where === "integration" ? norm !== "integration" : norm === "e2e" || (norm === "integration" && !!INT_DIRS.length);
    if (mismatch) fail("test-layers", `Test layers: ${f} — declared ${layer}, but lies as ${where} (${layerDirs(where)})`);
    // The permissive side: e2e may be declared only in the e2e_dir of the base (E2E_OK); a file in e2e only by the PR path is unit or integration by the base.
    else if (norm === "e2e" && !inDir(E2E_OK, f)) { const was = layerOf(f, E2E_OK); fail("test-layers", `Test layers: ${f} — declared ${layer}, but lies as ${was} (${layerDirs(was, E2E_OK)}; e2e_dir from the PR acts after merge)`); }
    if (where === "e2e") {
      if (!NOT_LOWER.test(seg)) fail("test-layers", `Test layers: ${f} — e2e without «${WHY_NOT_LOWER.en}: <why not integration or unit>»`);
      if (newTests.includes(f) && !NOT_STEP.test(seg)) fail("test-layers", `Test layers: ${f} — a new e2e file without «${WHY_NOT_STEP.en}: <why not a step in an existing scenario>»`);
    }
  }
}

// ---------- spec PR: «Change approved» (DEC-0055, DEC-0084, K24, DEC-0105 §2.1) ----------
// «Change approved: <person>, <YYYY-MM-DD HH:MM>, OI-N» and on the next line a quote of the human's words «> …»; the old
// Russian label is read too (compat, APPROVAL_LABEL). Here — only the format: everyone has their own input log, the quote is checked against
// the record by gate and ai-team check in the AI team of whoever approved. Whoever adopted the PR changed the change themselves — a
// new such line from their own human (there may be several lines).
const CHANGE_DEF = /^openspec\/changes\/(?!archive\/)[^/]+\/(proposal\.md|design\.md|specs\/.+)$/;
const APPROVAL_LINE = new RegExp(`^(${either(APPROVAL_LABEL)}):[ \\t]*(.*)$`);
const APPROVAL_VALUE = /^([a-z0-9][a-z0-9-]*)\s*,\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s*,\s*OI-\d+\s*$/;
const APPROVAL_FORMAT = `«${APPROVAL_LABEL.en}: <person>, <YYYY-MM-DD HH:MM>, OI-N» and on the next line a quote of the human's words «> …»`;
const realTime = (d, t) => { const x = new Date(`${d}T${t}:00Z`); return !Number.isNaN(x.getTime()) && x.toISOString().startsWith(`${d}T${t}`); };

/** «Change approved: …» lines (either form; label — as written) and the quote under each («> …» lines in a row). A dash and a template hint are not a line. */
function approvals(body) {
  const lines = body.replace(/\r\n?/g, "\n").split("\n");
  return lines.flatMap((l, i) => {
    const m = APPROVAL_LINE.exec(l);
    const value = m?.[2].trim() ?? "";
    if (!m || !value || /^[—–-]$/.test(value) || /<[^>]+>/.test(value)) return [];
    const quote = [];
    for (const q of lines.slice(i + 1)) { const x = /^[ \t]*>[ \t]?(.*)$/.exec(q); if (!x) break; quote.push(x[1]); }
    return [{ label: m[1], value, quote: quote.join("\n").trim() }];
  });
}

// A strict git for the change check: a refusal (no merge-base, a diff error, a buffer overflow) — an exception, not an empty answer.
const gitStrict = (...a) => execFileSync("git", ["-C", ROOT, "-c", "core.quotePath=false", ...a], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
/** «<mode> <type> <blob>\t<path>» from ls-tree -r -z → Map path → «mode blob» (the path — without the prefix pre). */
const treeEntries = (ref, pre) => new Map(gitStrict("ls-tree", "-r", "-z", ref, "--", pre).split("\0").filter(Boolean).map((e) => { const t = e.indexOf("\t"); const [mode, , sha] = e.slice(0, t).split(" "); return [e.slice(t + 1).slice(pre.length), `${mode} ${sha}`]; }));

/**
 * The archive of a change — by paths, not by the «rename» sign (git does not always see it: --no-renames, an edit while moving).
 * Change <name> is archived only if at the same time: (1) all files of openspec/changes/<name>/ from the merge-base are removed;
 * (2) there is nothing in this folder in the head; (3) exactly one new folder openspec/changes/archive/<YYYY-MM-DD>-<name>/ (it was
 * not in the merge-base); (4) the set of paths in it equals the set of removed ones; (5) the files of the change definition
 * (proposal, design, specs) have the same mode and blob as in the merge-base (an edit, a symlink, a submodule — not an archive);
 * tasks.md is free (ai-team merge checks it). Any doubt — not an archive: the former requirement «Change approved». A git refusal —
 * an exception.
 * → Set of the removed paths of archived changes (their removal is not a trigger).
 */
function archivedMoves(base, head, mb) {
  const tok = gitStrict("diff", IGN, "-z", "--no-renames", "--name-status", `${base}...${head}`).split("\0").filter(Boolean);
  const del = new Map(), add = new Map(); // change name → [rel]; date-name → [rel]
  for (let i = 0; i + 1 < tok.length; i += 2) {
    const [st, f] = [tok[i], tok[i + 1]];
    let m;
    if (st === "D" && (m = /^openspec\/changes\/(?!archive\/)([^/]+)\/(.+)$/.exec(f))) del.set(m[1], [...(del.get(m[1]) ?? []), m[2]]);
    else if (st === "A" && (m = /^openspec\/changes\/archive\/(\d{4}-\d{2}-\d{2}-[^/]+)\/(.+)$/.exec(f))) add.set(m[1], [...(add.get(m[1]) ?? []), m[2]]);
  }
  const ok = new Set();
  const same = (a, b) => a.length === b.length && new Set(a).size === a.length && b.every((x) => a.includes(x));
  for (const [name, gone] of del) {
    const dirs = [...add.keys()].filter((d) => d.replace(/^\d{4}-\d{2}-\d{2}-/, "") === name);
    if (dirs.length !== 1) continue;
    const pre = `openspec/changes/${name}/`, apre = `openspec/changes/archive/${dirs[0]}/`;
    if (treeEntries(mb, apre).size) continue; // the archive folder was already in the merge-base — not a new archive
    const inBase = treeEntries(mb, pre);
    if (!inBase.size || treeEntries(head, pre).size) continue;
    const inArch = treeEntries(head, apre);
    const keys = [...inBase.keys()];
    if (!same(gone, keys) || !same(add.get(dirs[0]), keys) || !same([...inArch.keys()], keys)) continue;
    if (keys.some((k) => CHANGE_DEF.test(pre + k) && inBase.get(k) !== inArch.get(k))) continue;
    for (const g of gone) ok.add(pre + g);
  }
  return ok;
}

/** A spec PR changes the definition of a change (proposal, design, specs) or adds a task — the line «Change approved» with a quote is needed. */
function checkChangeApproved(base, head, body) {
  let changed, mb;
  try {
    mb = gitStrict("merge-base", base, head).trim();
    if (!mb) throw new Error("merge-base is empty");
    const archived = archivedMoves(base, head, mb);
    // -z: names with quotes and tabs come as they are, not in quotes.
    changed = gitStrict("diff", IGN, "-z", "--no-renames", "--name-only", `${base}...${head}`).split("\0").filter(Boolean).filter((f) => !archived.has(f));
  } catch (e) {
    fail("change-approved", `git did not answer (${String(e.message).split("\n")[0]}) — whether the change changed cannot be checked: a base with a common history with the PR is needed (fetch without --depth, base ${base}); until then — red`);
    return;
  }
  let trigger = changed.filter((f) => CHANGE_DEF.test(f));
  if (!trigger.length) {
    for (const f of changed.filter(isActiveTasks)) {
      const before = new Set(Object.keys(tasksState(git("show", `${mb}:${f}`))));
      if (Object.keys(tasksState(read(f))).some((t) => !before.has(t))) trigger.push(f);
    }
  }
  if (!trigger.length) return;
  const list = approvals(body);
  if (!list.length) { fail("change-approved", `a spec PR changes a change (${trigger.slice(0, 3).join(", ")}) — the line ${APPROVAL_FORMAT} is needed: the human approves the change as a whole (spec/03)`); return; }
  for (const a of list) {
    const m = APPROVAL_VALUE.exec(a.value);
    if (!m || !realTime(m[2], m[3])) fail("change-approved", `«${a.label}: ${a.value}» — the format «<person>, <YYYY-MM-DD HH:MM>, OI-N» (the number of the record in the human's input log, ai-team said)`);
    else if (!a.quote || /^<[^>]*>$/.test(a.quote)) fail("change-approved", `«${a.label}: ${a.value}» — a quote of the human's words «> …» is needed on the next line — the text of their record in the input log`);
  }
}

/** Paths of the specs-archive-only rule: openspec/specs, everything under it and openspec itself (if it is a symlink, there is no folder under it in the diff). */
const SPECS_PATH = /^openspec\/specs(?:\/|$)|^openspec$/i; // i: on macOS and Windows `OpenSpec/Specs/…` are the same files

/**
 * Binding to a capability (the orchestrator's decision for the owner — how to change: remove the uncoveredCaps call in
 * checkSpecsArchiveOnly, then any archive in the PR is enough). An edit of openspec/specs/<cap>/** is allowed only if the archive of
 * THIS PR has a delta of this capability — openspec/changes/archive/<date>-<name>/specs/<cap>/ (what `openspec archive` moves): a
 * change with a delta was in the base and was moved without edits (archivedMoves). → paths of edits whose capability the archive
 * does not cover (a path without a capability — too).
 */
function uncoveredCaps(specs, archived) {
  const covered = new Set([...archived].map((f) => /^openspec\/changes\/[^/]+\/specs\/([^/]+)\//i.exec(f)?.[1]).filter(Boolean));
  return specs.filter((f) => !covered.has(/^openspec\/specs\/([^/]+)\//i.exec(f)?.[1]));
}

/**
 * specs-archive-only: openspec/specs/** is edited only in a PR that merges the archive of a change (its move to
 * openspec/changes/archive/<date>-<name>/), and only of the capability whose delta is in this archive. A symlink or a submodule
 * (mode 120000 / 160000) at openspec/specs, under it or at openspec — red in any PR, the archive one too: through it the spec is
 * edited past the rule; red also one that already lies in the base (the head tree). The diff file list — with
 * --ignore-submodules=none: `ignore = all` in .gitmodules of the PR does not hide a gitlink.
 */
function checkSpecsArchiveOnly(base, head) {
  let specs = [], links = [], archived, inTree;
  try {
    const mb = gitStrict("merge-base", base, head).trim();
    if (!mb) throw new Error("merge-base is empty");
    archived = archivedMoves(base, head, mb);
    // --raw -z: «:<mode before> <mode after> <blob before> <blob after> <status>\0<path>\0»
    const tok = gitStrict("diff", IGN, "-z", "--no-renames", "--raw", `${base}...${head}`).split("\0");
    for (let i = 0; i + 1 < tok.length; i += 2) {
      const f = tok[i + 1];
      if (!SPECS_PATH.test(f)) continue;
      specs.push(f);
      if (/^:\d+ (?:120000|160000) /.test(tok[i])) links.push(f);
    }
    // The head tree: a symlink or a submodule already lying in the base (the PR does not touch it, it is not in the diff) — red
    // too. Case-insensitive (the ls-tree pathspec is case-sensitive, and on macOS and Windows OpenSpec is the same folder): the top
    // level of the head → openspec entries (flag i); in the folder — specs entries; in the specs folder — everything deeper (-r).
    // A link higher in the path is the entry itself, we do not go deeper.
    const ls = (...a) => gitStrict("ls-tree", "-z", ...a).split("\0").filter(Boolean).map((e) => {
      const t = e.indexOf("\t");
      if (t < 0) throw new Error(`ls-tree: an unclear line «${e}»`);
      return { mode: e.slice(0, e.indexOf(" ")), f: e.slice(t + 1) };
    });
    const isLink = (x) => x.mode === "120000" || x.mode === "160000";
    const isDir = (x) => x.mode === "040000";
    const treeLinks = [], tops = ls(head).filter((x) => /^openspec$/i.test(x.f));
    for (const top of tops) {
      if (isLink(top)) { treeLinks.push(top.f); continue; }
      if (!isDir(top)) continue;
      for (const sp of ls(head, "--", `${top.f}/`).filter((x) => /^specs$/i.test(x.f.slice(top.f.length + 1)))) {
        if (isLink(sp)) treeLinks.push(sp.f);
        else if (isDir(sp)) treeLinks.push(...ls("-r", head, "--", `${sp.f}/`).filter(isLink).map((x) => x.f));
      }
    }
    inTree = [...new Set(treeLinks)];
  } catch (e) {
    fail("specs-archive-only", `git did not answer (${String(e.message).split("\n")[0]}) — whether openspec/specs changed cannot be checked; until then — red`);
    return;
  }
  const list = (a) => `${a.slice(0, 3).join(", ")}${a.length > 3 ? " …" : ""}`;
  if (links.length) { fail("specs-archive-only", `the PR puts ${list(links)} — a symlink or a submodule: they are forbidden in openspec/specs (through them the spec is edited past the rule), even in an archive PR — plain files are needed`); return; }
  if (inTree.length) { fail("specs-archive-only", `in the PR tree ${list(inTree)} — a symlink or a submodule (already in the base): they are forbidden in openspec/specs and in place of openspec, plain files are needed`); return; }
  const note = "openspec/specs is edited only in an archive PR — change the spec through a change in openspec/changes/<name>/specs/, and it gets into openspec/specs on archiving (the move of the change to openspec/changes/archive/<YYYY-MM-DD>-<name>/ by the same PR); the archive counts only if the change was in the base and was moved without edits of proposal, design and specs (an edit of a change and its archiving — in different PRs)";
  if (specs.length && !archived.size) fail("specs-archive-only", `the PR edits ${list(specs)}, but does not merge the archive of a change: ${note}`);
  else if (specs.length) {
    const bad = uncoveredCaps(specs, archived);
    if (bad.length) fail("specs-archive-only", `the PR edits ${list(bad)}, but does not merge the archive of a change with a delta of this capability (specs/<capability>/ in the archive of this PR; capability «${[...new Set(bad.map((f) => /^openspec\/specs\/([^/]+)\//i.exec(f)?.[1] ?? f))].join("», «")}» is not covered by the archive): ${note}`);
  }
}

// ---------- a PR with an ADR (DEC-0065): the human accepts; a proposal acts only after merge ----------
// «ADR takes effect after merge»; the old Russian line too (compat, ADR_PENDING).
const ADR_PENDING_LINE = new RegExp(either(ADR_PENDING), "i");
function checkAdrPr(base, head, body) {
  // --no-renames: for an ADR moved out of the folder the old path is visible too.
  const docs = git("diff", IGN, "--no-renames", "--name-only", `${base}...${head}`).split("\n").filter(isAdrDoc);
  if (docs.length && !ADR_PENDING_LINE.test(body)) fail("adr-human-merge", `the PR changes an ADR (${docs.join(", ")}) — the line «${ADR_PENDING.en}» in the description and the adr label; merge — only with the human's approval on the hosting or by their word «merge #N» (spec/13 §2)`);
}

// ---------- the ai-team-docs map (DEC-0049): a file without a line in the README map — a red PR ----------
function checkTeamDocsMap() {
  const files = lsFiles("ai-team-docs");
  if (!files.length) return;
  const readme = read("ai-team-docs/README.md");
  if (!readme) { fail("team-docs-map", "no ai-team-docs/README.md (the folder map) — a folder without a map cannot be understood (DEC-0049)"); return; }
  const listed = [...readme.matchAll(/^\|\s*`([^`|]+)`\s*\|/gm)].map((m) => m[1].trim().replace(/^ai-team-docs\//, ""));
  for (const f of files) {
    const rel = f.slice("ai-team-docs/".length);
    if (!listed.some((x) => x === rel || (x.endsWith("/") && rel.startsWith(x)))) fail("team-docs-map", `${f}: the file is not in the map ai-team-docs/README.md — add a line (what it is, who edits it) or put the file elsewhere`);
  }
}

// ---------- people of the team: ids without repeats (spec/01 §6) ----------
// A repeat appears on a manual rebase of a join PR (a conflict in people): two AI teams with one id share branches and labels.
function checkPeopleIds() {
  const rows = sections(read("ai-team-docs/config/roles.md")).people?.rows ?? [];
  const seen = new Map();
  for (const r of rows) {
    const id = String(r.id ?? "").trim();
    if (!id || id === "—" || /^<.*>$/.test(id)) continue;
    const k = id.toLowerCase();
    if (seen.has(k)) fail("people-ids", `ai-team-docs/config/roles.md → people: id «${id}» repeats (there is already «${seen.get(k)}», case does not count) — one id — one AI team: the second one gets its own id; a join PR — repeat the join on a fresh base rather than resolve the conflict by hand`);
    else seen.set(k, id);
  }
}

function checkBareRefs() {
  const files = lsFiles(...ADR_DIRS, "ai-team-docs").filter((f) => f.endsWith(".md") && !/(^|\/)history\//.test(f)); // history — the former text as it was
  for (const f of files) read(f).split("\n").forEach((line, i) => {
    if (/\b(?:ADR|ATD|DEC)[\s_]?\d{1,4}\b(?!-)|\b(?:ADR|ATD|DEC)-\d{1,3}\b|\b(?:adr|atd)-\d{4}\b/.test(line.replace(/\b(?:ADR|ATD|DEC)-\d{4}/g, ""))) fail("bare-refs", `${f}:${i + 1}: a link to a decision — only «ADR-NNNN», «ATD-NNNN», «DEC-NNNN»`);
    if (/\bOQ-\d+\b/.test(line)) fail("bare-refs", `${f}:${i + 1}: OQs are not mentioned in the team documents (they are personal)`);
  });
}

// ---------- e2e-targets: what to run in the targeted e2e lane of CI (spec/05 §3) ----------
function e2eTargets(base, body) {
  const rel = (g) => g.replace(/^\.\//, ""); // «./tests/…» — the same as «tests/…»
  const listed = globsOf(/^E2E:[ \t]*(.*)$/m.exec(body ?? "")?.[1] ?? "").map(rel);
  const changed = base ? git("diff", IGN, "--name-only", `${base}...${HEAD}`).split("\n").filter(Boolean) : [];
  const map = (overlay["e2e-map"]?.rows ?? []).filter((r) => r.path && !/^</.test(r.path));
  const mapped = map.filter((r) => changed.some((f) => matches([rel(r.path)], f))).flatMap((r) => globsOf(r.e2e).map(rel));
  const all = lsFiles();
  const out = new Set();
  for (const g of [...listed, ...mapped]) for (const f of all) if (f === g || matches([g], f)) out.add(f);
  return [...out];
}

// ---------- rule data: strict — the union of the base and the PR head, permissive — the base ----------
// Rule data: paths (e2e_dir, e2e_browser_marker, integration_dir, security_tests, adr_dir…), forbidden-locators, e2e-map.
// The project section (integration_branch is needed before the base is known) stays from the head. There is no project overlay in
// the base yet (the AI kit setup PR) — from the PR.
// Strict data (checks more) — the union: «only the base» lets a mirror bypass through (a PR moves adr_dir or e2e_dir to a new folder
// and puts a file there that was not checked by the base). Permissive data (WEAKENING: e2e_browser_marker, integration_dir; the
// permissive side of e2e_dir — where e2e may be declared, E2E_OK) — only the base: otherwise a PR adds its own sign or folder and passes.
const DATA_SECTIONS = ["paths", "forbidden-locators", "e2e-map"];
const DATA_COLS = { paths: ["kind", "globs"], "forbidden-locators": ["pattern"], "e2e-map": ["path", "e2e"] }; // description columns (what it is, why) are not data
const dataKey = (sec, k) => JSON.stringify((sec?.rows ?? []).map((r) => JSON.stringify(DATA_COLS[k].map((c) => r[c] ?? ""))).sort());
/** The rows of two tables as one list, without repeats by the data columns (the base first). */
function unionRows(a, b, k) {
  const seen = new Set();
  const rows = [...(a?.rows ?? []), ...(b?.rows ?? [])].filter((r) => { const key = JSON.stringify(DATA_COLS[k].map((c) => r[c] ?? "")); return !seen.has(key) && seen.add(key); });
  return { header: a?.header ?? b?.header ?? [], rows };
}
// Strict — the union of the base and the PR, permissive — the base; how to change: WEAKENING and E2E_OK (paths fields) and unionRows (sections) above.
/** Rule data → the list of sections whose data the PR changes, or null (no overlay in the base). */
function useBaseData(baseRef) {
  const baseText = baseRef ? git("show", `${baseRef}:ai-team-docs/config/project-overlay.md`) : "";
  if (!baseText) return null;
  const bs = sections(baseText);
  const changed = DATA_SECTIONS.filter((k) => dataKey(overlay[k], k) !== dataKey(bs[k], k));
  overlay = { ...overlay, "forbidden-locators": unionRows(bs["forbidden-locators"], overlay["forbidden-locators"], "forbidden-locators"), "e2e-map": unionRows(bs["e2e-map"], overlay["e2e-map"], "e2e-map") };
  const basePaths = kv(bs.paths, "kind", "globs");
  pathsList = [basePaths, pathsCfg];
  pathsWeak = [basePaths];
  const ignored = WEAKENING.filter((k) => globsOf(basePaths[k]).join(",") !== globsOf(pathsCfg[k]).join(","));
  if (ignored.length) notes.push(`ℹ️ the PR changes ${ignored.join(", ")} in the project overlay — data that weakens the check is taken from the base ${baseRef}, the new one acts after merge`);
  ADR_DIRS = [...new Set(pathsList.map((c) => projectAdrDir(c.adr_dir)))];
  PROJECT_ADR = ADR_DIRS[0];
  // An ADR set per folder: decisions the PR put into a new folder are checked as ADRs (header, index, «the human merges»).
  SETS.splice(0, SETS.filter((st) => st.prefix === "ADR").length, ...ADR_DIRS.map(adrSet));
  E2E_DIRS = dirsOf("e2e_dir");
  E2E_OK = dirsIn(pathsWeak, "e2e_dir");
  INT_DIRS = dirsOf("integration_dir");
  return changed;
}

// ---------- run ----------
if (args[0] === "e2e-targets") {
  const b = opt("base") || (process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : "");
  // One per line: paths may have spaces (CI reads through mapfile). No targets — print nothing:
  // an empty line would become the target «» — and an empty Playwright filter matches all tests.
  // --regex: paths as a Playwright filter (its CLI arguments are regexes, and paths may have ( ) [ ]).
  useBaseData(b);
  const targets = e2eTargets(b, opt("pr-body") ? readFileSync(opt("pr-body"), "utf8") : process.env.PR_BODY ?? "")
    .map((f) => (args.includes("--regex") ? f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : f));
  if (targets.length) process.stdout.write(`${targets.join("\n")}\n`);
  process.exit(0);
}
if (args[0] === "adr-index") {
  if (!D) { console.error(NO_DECISIONS); process.exit(1); }
  // The ADR set — only if the adr rule is on: ADRs of the project's own format (keep-own, adr: no) are not our business, their
  // README is neither written nor checked (I18). The ATD set — only if the ai-team-docs folder exists (a project without AI kit files).
  const sets = SETS.filter((st) => (st.prefix === "ADR" ? on("adr") : lsFiles("ai-team-docs").length));
  if (!on("adr")) console.log(`project ADRs are its own (the adr rule is off in the project overlay): the index ${PROJECT_ADR}/README.md is neither built nor checked`);
  if (args.includes("--check")) {
    let stale = 0;
    for (const set of sets) {
      const rel = `${set.dir}/README.md`;
      const existing = read(rel) || null;
      const text = existing === null ? null : D.buildReadme(existing, set.prefix, D.loadFolder(readerOf(set.dir), set.prefix).decisions);
      if (text === null || text !== existing) { stale++; console.log(`index ${rel} ${existing === null ? "is missing" : text === null ? "has no markers" : "is stale"} — ${INDEX_CMD}`); }
    }
    if (!stale) console.log("decision indexes are fresh");
    process.exit(stale ? 1 : 0);
  }
  if (args.includes("--write")) process.exit(writeIndexes(sets) ? 1 : 0);
  for (const set of sets) console.log(`## ${set.dir}/README.md\n\n${D.renderIndex(D.loadFolder(readerOf(set.dir), set.prefix).decisions)}\n`);
  process.exit(0);
}
if (args[0] === "adr-bundle") {
  if (!D) { console.error(NO_DECISIONS); process.exit(1); }
  const text = adrBundle();
  if (opt("out")) { writeFileSync(opt("out"), text); console.log(`active ADR and ATD — ${opt("out")}`); } else process.stdout.write(text);
  process.exit(0);
}

const baseRef = opt("base") || (process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : project.integration_branch ? `origin/${project.integration_branch}` : "");
const base = baseRef && git("rev-parse", "--verify", "-q", `${baseRef}^{commit}`).trim() ? baseRef : "";
if (!base) notes.push(`⚠️ the base ${baseRef || "(not set)"} is not found (a shallow clone? an unfilled project overlay?) — the diff checks went over the whole tree, Tasks: was not checked`);
// Whether process guard rules are on — from the base, not from the PR head; rule data — strict by the union, permissive from the
// base (useBaseData). There is no project overlay in the base yet (the AI kit setup PR) — from the PR.
if (base) {
  const baseText = git("show", `${base}:ai-team-docs/config/project-overlay.md`);
  if (baseText) {
    const baseRules = { ...RULE_DEFAULTS, ...kv(sections(baseText)["process-guard"], "rule", "on") };
    const changed = Object.keys({ ...rules, ...baseRules }).filter((r) => RULE_ON_RE.test(rules[r] ?? "") !== RULE_ON_RE.test(baseRules[r] ?? ""));
    if (changed.length) notes.push(`ℹ️ the PR changes process guard rules (${changed.join(", ")}) — the check goes by the rules of the base ${base}; the new ones act after merge`);
    rules = baseRules;
  }
  const changedData = useBaseData(base);
  if (changedData?.length) notes.push(`ℹ️ the PR changes rule data in the project overlay (${changedData.join(", ")}) — strict data is the union of the base ${base} and the PR, permissive data (the browser sign, integration_dir, where e2e may be declared) — from the base, the new data acts after merge`);
}
const head = HEAD;
const bodyFile = opt("pr-body");
// PR template comments (<!-- … -->) are not PR text: they have hints like «ADR takes effect after merge».
const rawBody = bodyFile ? (existsSync(bodyFile) ? readFileSync(bodyFile, "utf8") : "") : process.env.PR_BODY ?? null;
const body = rawBody === null ? null : rawBody.replace(/<!--[\s\S]*?-->/g, "");

if (on("tier-labels")) checkTierLabels(base);
checkDecisions(base, SETS.filter((st) => st.rule !== "adr" || on("adr"))); // ATD — always, project ADR — by the adr rule
checkLegacyAtdDir(base);
if (on("quarantine")) checkQuarantine();
const LINE_RULES = ["skip-reason", "no-wait-timeout", "no-sleep", "no-serial", "forbidden-locators", "e2e-no-browser", "test-layers"];
const lines = LINE_RULES.some(on) ? addedTestLines(base, head, args.includes("--all")) : [];
// New files for isTestCode (test-layers, e2e-no-browser): --raw -z, without submodules (mode 160000 — a gitlink, not a file: read()
// of a submodule folder in the working copy would fail with EISDIR, and there is nothing to require «Test layers:» for).
const newFiles = [];
if (base) {
  const tok = git("diff", IGN, "-z", "--raw", "--diff-filter=A", `${base}...${head}`).split("\0");
  for (let i = 0; i + 1 < tok.length; i += 2) if (!/^:\d+ 160000 /.test(tok[i])) newFiles.push(tok[i + 1]);
}
if (on("skip-reason")) checkSkips(lines);
if (on("no-sleep")) checkWaits(lines, "no-sleep");
else if (on("no-wait-timeout")) checkWaits(lines, "no-wait-timeout");
if (on("no-serial")) checkSerial(lines);
if (on("forbidden-locators")) checkLocators(lines);
if (on("e2e-no-browser")) checkE2eBrowser(lines, newFiles);
if (on("bare-refs")) checkBareRefs();
if (on("specs-archive-only") && base) checkSpecsArchiveOnly(base, head);
if (on("team-docs-map")) checkTeamDocsMap();
if (on("people-ids")) checkPeopleIds();
if (body !== null) {
  if (on("pr-fields")) checkPrFields(body);
  if (on("tasks-field") && base) checkTasksField(base, head, body);
  if (on("test-layers")) checkTestLayers(body, newFiles, lines);
  if (on("change-approved") && base) checkChangeApproved(base, head, body);
  if (on("adr-human-merge") && base) checkAdrPr(base, head, body);
}

for (const n of notes) console.log(n);
if (problems.length) {
  console.log(`process guard: ${problems.length} violations`);
  for (const p of problems) console.log(`- ${p}`);
  process.exit(1);
}
console.log(`process guard: green${base ? ` (base ${base})` : ""}${body === null ? "; the PR description is not passed — the PR template fields were not checked" : ""}`);

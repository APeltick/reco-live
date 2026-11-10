#!/usr/bin/env node
// AI kit: the CI threshold «not worse than it was» (spec/05 §8, DEC-0112) — a CI step without AI, after the checks of pr-checks.yml.
//   node .github/ai-team/ci-baseline.mjs check [--base <sha>] [--started <unix seconds>] <log>…
// <log> — the saved output of the lint and typecheck steps (tee). Warnings are counted from what the linter prints (eslint, next lint,
// biome, ruff; tsc — recognized, it has only errors); a log nobody recognizes is «not measured», not 0 and not red.
// The base — .github/ai-team/ci-baseline.json: { warnings, duration_s, updated, sha }. On a PR it is read from the base commit (--base):
// a PR cannot loosen its own threshold. No base — the threshold is not checked, the step says how to create it.
// Red: warnings grew by more than 10 % and by at least 1 (base 0 — any warning). Time grew by more than 10 % — only a warning:
// the time of shared CI machines jumps by ±20 %. In GitHub Actions — the annotation «ai-kit ci metrics» with the measurements:
// `ai-team ci baseline` builds the base from it (by the last green run on the integration branch). The script writes nothing into the repository.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const BASELINE_FILE = ".github/ai-team/ci-baseline.json";
export const METRICS_TITLE = "ai-kit ci metrics";
/** Growth over the base that counts as worse, in percent; warnings — also at least MIN_GROWTH more. */
export const GROWTH_PCT = 10;
export const MIN_GROWTH = 1;
export const RECOGNIZED = "eslint (stylish), next lint, biome, ruff, tsc";

const sum = (text, re) => [...text.matchAll(re)].reduce((n, m) => n + Number(m[1]), 0);
/** The command line of the log: `+ cmd` (the step writes its command first), npm/pnpm (`> cmd`), yarn (`$ cmd`); a turbo prefix «pkg:lint: » is allowed. */
const ran = (text, tool) => new RegExp(`^(?:\\S+: )?[+>$] [^\\n]*\\b${tool}\\b`, "m").test(text);

/**
 * Warnings in one step's output. → { tool, warnings } | null (not recognized).
 * Several tools in one log (a monorepo) — the counts are added up; tool — their names joined by «+».
 */
export function parseWarnings(text = "") {
  const t = String(text).replace(/\x1b\[[0-9;]*m/g, ""); // colours
  const found = [];
  // Each tool is recognized and counted on its own, the counts add up: a turbo monorepo prints next lint of one package and eslint of another
  // into one log — one tool must not hide the other (a fixed eslint warning would leave next lint alone against a base of both).
  // eslint, the stylish format only: «✖ 12 problems (3 errors, 9 warnings)»; clean — eslint prints nothing, then the command line says it ran.
  // Other eslint formats (compact, unix, json) have no such summary — 0 (DEC-0112, limits).
  if (/✖ \d+ problems? \(/.test(t) || ran(t, "eslint")) found.push(["eslint", sum(t, /✖ \d+ problems? \(\d+ errors?, (\d+) warnings?\)/g)]);
  // next lint: «12:7  Warning: …» lines (its own format, no ✖ summary); clean — «No ESLint warnings or errors».
  if (/No ESLint warnings or errors/.test(t) || ran(t, "next lint")) found.push(["next lint", (t.match(/^(?:\S+: )?\s*\d+:\d+\s+Warning: /gm) ?? []).length]);
  // biome: «Checked 42 files in 10ms.», «Found 3 warnings.»
  if (/\bChecked \d+ files? in \S+/.test(t) || ran(t, "biome")) found.push(["biome", sum(t, /\bFound (\d+) warnings?\b/g)]);
  // ruff check: «All checks passed!» or «Found 3 errors.» — ruff has no warnings: its violations are counted (with --exit-zero they do not fail the step).
  // biome prints «Found N errors.» too, but biome errors fail the lint step, so the threshold step does not run then.
  if (/All checks passed!/.test(t) || /^(?:\S+: )?\[\*\] \d+ fixable with the `--fix` option/m.test(t) || ran(t, "ruff")) found.push(["ruff", sum(t, /^(?:\S+: )?Found (\d+) errors?\./gm)]);
  // tsc: only errors (error TS…), they fail the typecheck step — 0 warnings; alone it does not make the count measured (measure).
  if (/error TS\d+:/.test(t) || ran(t, "tsc")) found.push(["tsc", 0]); // vue-tsc too: «-» is a word boundary
  if (!found.length) return null;
  return { tool: found.map(([n]) => n).join("+"), warnings: found.reduce((n, [, w]) => n + w, 0) };
}

/**
 * Warnings over the step logs: [{ name, text }] → { warnings: number|null, parts: [{ name, tool, warnings }], unknown: [name] }.
 * warnings — the sum over the recognized logs; no log of a tool with warnings (tsc alone has none: an unknown linter next to it) — null («not measured»).
 */
export function measure(logs = []) {
  const parts = [], unknown = [];
  for (const l of logs) {
    const r = parseWarnings(l.text);
    if (r) parts.push({ name: l.name, ...r }); else unknown.push(l.name);
  }
  const measured = parts.some((x) => x.tool !== "tsc");
  return { warnings: measured ? parts.reduce((n, x) => n + x.warnings, 0) : null, parts, unknown };
}

/** The base file text → { baseline } | { error }. warnings and duration_s — a non-negative number or null (not measured). */
export function readBaseline(text) {
  let b;
  try { b = JSON.parse(text); } catch (e) { return { error: `not JSON: ${e.message}` }; }
  if (!b || typeof b !== "object" || Array.isArray(b)) return { error: "not an object" };
  for (const k of ["warnings", "duration_s"]) {
    if (b[k] === undefined) b[k] = null;
    if (b[k] !== null && !(Number.isFinite(b[k]) && b[k] >= 0)) return { error: `${k}: a non-negative number or null is needed, got ${JSON.stringify(b[k])}` };
  }
  return { baseline: b };
}

/** cur is worse than base by more than GROWTH_PCT percent (integers: 10 → 11 is exactly 10 %, not worse). */
const worse = (cur, base) => (cur - base) * 100 > base * GROWTH_PCT;
const HOW = `\`ai-team ci baseline\` (lead, by the last green run on the integration branch; or a human in a terminal) writes ${BASELINE_FILE} — merge it in a PR`;

/**
 * The threshold. current: { warnings: number|null, duration_s: number|null }; base: { baseline } | { error } | null (no file).
 * → { fail: boolean, lines: [{ level: "error"|"warning"|"notice"|"info", title, text }] }. Red — only warnings; time — at most a warning.
 */
export function decide(current, base) {
  const lines = [], say = (level, text, title = "ai-kit warnings") => lines.push({ level, title, text });
  const cw = current?.warnings ?? null, cd = current?.duration_s ?? null;
  say("info", `warnings: ${cw ?? "not measured"}; time: ${cd !== null ? `${cd} s` : "not measured"}`);
  if (!base) { say("info", `no base (${BASELINE_FILE}) — the threshold is not checked; create it: ${HOW}`); return { fail: false, lines }; }
  if (base.error) { say("warning", `the base ${BASELINE_FILE} cannot be read (${base.error}) — the threshold is not checked; fix the file or rebuild it: ${HOW}`, "ai-kit ci baseline"); return { fail: false, lines }; }
  const b = base.baseline;
  let fail = false;
  const when = [b.sha && String(b.sha).slice(0, 7), b.updated].filter(Boolean).join(", ");
  const at = when ? ` (${when})` : "";
  if (cw === null) say("info", `warnings are not measured (the lint and typecheck output is not recognized; recognized: ${RECOGNIZED}) — the warnings threshold is not checked`);
  else if (b.warnings === null) say("info", "the base has no warnings count — the warnings threshold is not checked");
  else if (worse(cw, b.warnings) && cw - b.warnings >= MIN_GROWTH) {
    fail = true;
    say("error", `warnings: ${cw} > the base ${b.warnings}${at} — more than ${GROWTH_PCT} % and by ${cw - b.warnings}: fix the new warnings in this PR (the base is read from the base commit, a PR does not raise it for itself); a deliberate rise (a new lint rule, a dependency update) — a hand edit of ${BASELINE_FILE} in a separate PR merged first, on the human's word`);
  } else if (cw < b.warnings) say("notice", `warnings: ${cw} < the base ${b.warnings}${at} — fewer than the base: after the merge raise the bar — \`ai-team ci baseline\` (ratchet)`);
  else say("info", `warnings: ${cw}, the base ${b.warnings} — not worse`);
  if (cd !== null && b.duration_s) {
    if (worse(cd, b.duration_s)) say("warning", `time: ${cd} s > the base ${b.duration_s} s${at} — more than ${GROWTH_PCT} %: not red (the time of shared CI machines jumps by ±20 %), look at what got slower`, "ai-kit ci time");
    else say("info", `time: ${cd} s, the base ${b.duration_s} s — not worse than ${GROWTH_PCT} %`);
  }
  return { fail, lines };
}

/** The base on the commit (git show <sha>:file) or in the working folder (no sha: a push to the integration branch). → { baseline } | { error } | null. */
export function loadBaseline({ base = "", cwd = process.cwd() } = {}) {
  if (base) {
    const r = spawnSync("git", ["show", `${base}:${BASELINE_FILE}`], { cwd, encoding: "utf8" });
    if (r.status !== 0) return null;
    return readBaseline(r.stdout);
  }
  return existsSync(BASELINE_FILE) ? readBaseline(readFileSync(BASELINE_FILE, "utf8")) : null;
}


function main(argv) {
  const [cmd, ...rest] = argv;
  if (cmd !== "check") { console.error("usage: node .github/ai-team/ci-baseline.mjs check [--base <sha>] [--started <unix seconds>] <log>…"); return 2; }
  let base = "", started = "";
  const files = [];
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--base") base = rest[++i] ?? "";
    else if (rest[i] === "--started") started = rest[++i] ?? "";
    else files.push(rest[i]);
  }
  const logs = files.filter((f) => existsSync(f)).map((f) => ({ name: f.replace(/^.*\//, ""), text: readFileSync(f, "utf8") }));
  const m = measure(logs);
  const t0 = Number(started);
  const duration_s = started && Number.isFinite(t0) && t0 > 0 ? Math.max(0, Math.round(Date.now() / 1000 - t0)) : null;
  for (const x of m.parts) console.log(`${x.name}: ${x.tool} — ${x.warnings} warnings`);
  for (const n of m.unknown) console.log(`${n}: not recognized (recognized: ${RECOGNIZED}) — not measured`);
  const gha = !!process.env.GITHUB_ACTIONS;
  // The measurements — for `ai-team ci baseline` (it reads the annotations of the checks job).
  if (gha) console.log(`::notice title=${METRICS_TITLE}::${JSON.stringify({ warnings: m.warnings, duration_s })}`);
  const d = decide({ warnings: m.warnings, duration_s }, loadBaseline({ base }));
  for (const l of d.lines) console.log(gha && l.level !== "info" ? `::${l.level} title=${l.title}::${l.text}` : l.text);
  return d.fail ? 1 : 0;
}

const self = (() => { try { return realpathSync(fileURLToPath(import.meta.url)); } catch { return ""; } })();
const entry = (() => { try { return realpathSync(process.argv[1] ?? ""); } catch { return ""; } })();
if (self && self === entry) process.exit(main(process.argv.slice(2)));

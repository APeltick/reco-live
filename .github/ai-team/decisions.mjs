#!/usr/bin/env node
// Decisions of three kinds (DEC-0091): DEC — the AI kit flow, ADR — the project's decisions, ATD — the work of the AI team in the project.
// A decision is a file "as decided now" (<ID>-<slug>.md), next to it the history history/<the same file>: newest entries first.
// One script and one set of templates (templates/decisions/) for the three kinds: the kind changes the folder and the prefix.
// Node >= 22 only, no dependencies and no AI kit libraries — the file can be copied into a project as is.
//
//   node utils/decisions.mjs index <folder> --prefix DEC|ADR|ATD [--check]
//   node utils/decisions.mjs check <folder> --prefix DEC|ADR|ATD [--base <ref>] [--head <ref>] [--link <KIND>=<folder>]…
// The copy in a project is .github/ai-team/decisions.mjs (the process guard calls it in the project's CI, without the AI kit); copy = this file.
//
// The frame of a decision file is written in English (DEC-0105 §2.6: Status / Accepted / Changed / Template / History, the sections
// Why / Options / Decision / Consequences / Related, the history kinds accepted | changed | revoked). The files that people already
// have, written in the Russian form of an older AI kit, are still read (the `compat` places below); nothing is ever written in Russian.
//
// index           build <folder>/README.md: the active decisions (ID · question · gist · changed), below — the revoked ones;
//                 the gist is the first sentence of the "Decision" section. Writes only between the index markers.
//   --check       do not write, compare: the README is fresh — exit 0, otherwise 1.
// check           the header and sections of the template, the history (newest entries first), IDs and file names, links DEC-/ADR-/ATD-NNNN;
//                 the former name NNNN-<slug>.md of DEC and ATD is an error (the old form is only for the project's ADR).
//   --base <ref>  a decision that already existed at the branch point from <ref> (merge-base, like the PR diff) has changed —
//                 a new entry is needed on top of the history, its "Was" is the previous text from the base (spaces do not count);
//                 an edit of an HTML comment is not an edit; earlier history entries are not edited; decisions cannot be deleted; a new ADR
//                 in the old form is an error (the old form is only for the ADRs that were in the base);
//                 a repeated number is an error only for files that are not in the base (an already merged repeat is a note).
//   --head <ref>  check the tree of <ref>, not the working copy (gate, CI).
//   --link <KIND>=<folder>  where the decisions of another kind lie — to check the links to them (without it they are not checked).
// Exit code: 0 — all is well, 1 — errors (or a wrong call).
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const KINDS = {
  DEC: { title: "AI kit decisions (DEC)" },
  ADR: { title: "Project decisions (ADR)" },
  ATD: { title: "Decisions about the work of the AI team (ATD)" },
};
// The sections of the templates — in the template order (templates/decisions/full.md, minimal.md).
export const TEMPLATES = {
  full: ["Why", "Options", "Decision", "Consequences", "Related"],
  minimal: ["Why", "Decision", "Consequences"],
};
// compat: the Russian forms written by an older AI kit (DEC-0105 §2.6) are read next to the English ones; the canonical form is English.
const TEMPLATE_NAMES = { full: "full", minimal: "minimal", "полный": "full", "минимум": "minimal" };
const SECTION_ALIASES = {
  why: "Why", options: "Options", decision: "Decision", consequences: "Consequences", related: "Related",
  "почему": "Why", "варианты": "Options", "решение": "Decision", "что из этого следует": "Consequences", "что следует": "Consequences", "связанные": "Related", // compat
};
const HISTORY_KINDS = { accepted: "accepted", changed: "changed", revoked: "revoked", "принято": "accepted", "изменено": "changed", "отменено": "revoked" }; // compat: the Russian kinds
// The labels of the header and of the history entry: the English one is written, the Russian one (compat) is read too.
const LABEL = { status: "Status|Статус", accepted: "Accepted|Принято", changed: "Changed|Изменено", template: "Template|Шаблон", history: "History|История" };
const WHY_RE = /\*\*(?:Why|Почему):\*\*/u; // compat: «Почему»
const WAS_RE = /\*\*(?:Was \(before|Было \(до)[^*\n]*\*\*/u; // compat: «Было (до …)»
const BEGIN = "<!-- decisions-index:begin -->";
const END = "<!-- decisions-index:end -->";
// The former index markers of the project's ADR (ai-team:adr-index, before DEC-0091) are understood too and stay as they are.
const INDEX_RE = /<!-- (decisions-index|ai-team:adr-index):begin -->[\s\S]*?<!-- \1:end -->/;
const SCRIPT = fileURLToPath(import.meta.url);

class UsageError extends Error {}

// ---------- markdown ----------

const norm = (s) => String(s ?? "").replace(/\r\n?/g, "\n");
const stripComments = (s) => s.replace(/<!--[\s\S]*?-->/g, "");
/** For comparing versions: line ends and trailing spaces do not count. */
const same = (s) => norm(s).split("\n").map((l) => l.trimEnd()).join("\n").trim();
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s ?? "") && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);
const isDash = (s) => /^[—–-]?$/.test((s ?? "").trim());

/** Lines marked "inside a code block" (``` and ~~~). */
function mdLines(text) {
  const out = [];
  let fence = null;
  for (const line of norm(text).split("\n")) {
    const m = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (m && !fence) { fence = m[1]; out.push({ text: line, code: true }); continue; }
    if (m && fence && m[1][0] === fence[0] && m[1].length >= fence.length) { fence = null; out.push({ text: line, code: true }); continue; }
    out.push({ text: line, code: !!fence });
  }
  return out;
}

/** The title "# …", the text up to the first "## " (the header) and the sections "## …" outside code blocks. */
function splitDoc(text) {
  let title = null;
  const head = [];
  const sections = [];
  let cur = null;
  for (const l of mdLines(text)) {
    if (!l.code && title === null && !cur && /^#\s/.test(l.text)) { title = l.text.replace(/^#\s+/, "").trim(); continue; }
    const h = !l.code && /^##\s+(.+?)\s*#*\s*$/.exec(l.text);
    if (h) { cur = { name: h[1].trim(), lines: [] }; sections.push(cur); continue; }
    (cur ? cur.lines : head).push(l.text);
  }
  return { title, head: head.join("\n"), sections: sections.map((s) => ({ name: s.name, body: s.lines.join("\n") })) };
}

const canonSection = (name) => {
  const n = name.replace(/[.:]+$/, "").trim();
  const k = n.toLowerCase();
  return Object.hasOwn(SECTION_ALIASES, k) ? SECTION_ALIASES[k] : n;
};

/**
 * A template hint: a whole line (or a table cell, or the value after "**Field:**") in angle brackets: with a space, a «…», the date
 * placeholder YYYY-MM-DD, or a Cyrillic letter (compat: the hints of the Russian templates of an older AI kit, «<ГГГГ-ММ-ДД>»).
 */
const HINT = /^<[^<>]*(?:[\s\u0400-\u04ff…]|YYYY)[^<>]*>[.,;:]?$/;
function findHints(text) {
  const found = [];
  for (const l of mdLines(stripComments(norm(text)))) {
    if (l.code) continue;
    const s = l.text.trim().replace(/^(?:>\s*)+/, "").replace(/^#{1,6}\s+/, "").replace(/^(?:[-*+]|\d+[.)])\s+/, "").replace(/^\*\*[^*]+:\*\*\s*/, "");
    const parts = s.startsWith("|") ? s.split("|").map((c) => c.trim().replace(/^\*\*(.*)\*\*$/, "$1")) : [s, ...s.split(/\s+·\s+/)];
    for (const p of parts) if (HINT.test(p)) found.push(p);
  }
  return [...new Set(found)];
}

// ---------- the gist: the first sentence ----------

// compat: the Russian abbreviations (the text of a decision may be Russian) are cut-proof too.
const ABBR = /(?:^|[\s(«".])(?:[a-zа-яё]|см|напр|др|стр|рис|гл|ср|англ|e\.g|i\.e|etc|vs|cf|approx|fig)$/i;

/** The first sentence of a paragraph: it ends at ".", "!", "?" or "…" before a space; code in `…` and abbreviations ("e.g.") do not cut. */
export function firstSentence(text) {
  const s = text.replace(/\s+/g, " ").trim();
  let code = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "`") { code = !code; continue; }
    if (code || !".!?…".includes(c)) continue;
    let j = i + 1;
    while (j < s.length && "*_»\")".includes(s[j])) j++;
    if (j < s.length && s[j] !== " ") continue;
    if (c === "." && ABBR.test(s.slice(0, i))) continue;
    return { sentence: s.slice(0, j), rest: s.slice(j).trim() };
  }
  return { sentence: s, rest: "" };
}

/** The first paragraph of a text (or the first list item) without the list marker; tables and code blocks are skipped. */
function firstParagraph(body) {
  const out = [];
  for (const l of mdLines(stripComments(body))) {
    const t = l.text.trim();
    if (l.code || t.startsWith("|") || /^#{1,6}\s/.test(t)) { if (out.length) break; continue; }
    if (!t) { if (out.length) break; continue; }
    const item = /^(?:>\s*)?(?:[-*+]|\d+[.)])\s+(.*)$/.exec(t);
    if (item && out.length) break;
    out.push((item ? item[1] : t.replace(/^>\s*/, "")).trim());
  }
  return out.join(" ");
}

/** The gist of a decision in one phrase — the first sentence of the section; if it is only a bold label ("**Input log.**") — with the continuation. */
export function summaryOf(body) {
  const p = firstParagraph(body ?? "");
  if (!p) return "";
  const { sentence, rest } = firstSentence(p);
  if (/^\*\*[^*]+\*\*$/.test(sentence) && rest) return `${sentence} ${firstSentence(rest).sentence}`;
  return sentence;
}

// ---------- parsing files ----------

/**
 * What a file is, by its name: a decision of the new kind, an old ADR (NNNN-<slug>.md), "looks like one, but the name is wrong" or not a decision.
 * The former name NNNN-<slug>.md of ATD and DEC is not a decision of the old kind but a wrong name (oldName, num — the number from the name):
 * the old form stays only for the project's ADR (DEC-0091). The template 0000 is not a decision.
 */
export function nameInfo(name, prefix) {
  if (!name.endsWith(".md") || name === "README.md") return null;
  // The AI kit template (RB42; decision-paths.mjs → TEMPLATE_NAMES): 0000-template.md and its names with a prefix — not a decision, not a name error.
  if (/^(?:(?:ADR|ATD|DEC)-)?0000-template\.md$/.test(name)) return null;
  const m = new RegExp(`^${prefix}-(\\d{4})-([a-z0-9]+(?:-[a-z0-9]+)*)\\.md$`).exec(name);
  if (m && +m[1] > 0) return { id: `${prefix}-${m[1]}`, num: +m[1], style: "new" };
  // "adr-NNNN-…" is the former name, in any case, only for ADR; for ATD and DEC "ADR-NNNN-…" is another kind's decision, not a former name.
  const l = (prefix === "ADR" ? /^(?:adr-)?(\d{3,4})-.+\.md$/i : /^(?:adr-)?(\d{3,4})-.+\.md$/).exec(name);
  if (l && +l[1] > 0) return prefix === "ADR" ? { id: `ADR-${l[1].padStart(4, "0")}`, num: +l[1], style: "legacy" } : { bad: true, oldName: true, num: +l[1] };
  if (new RegExp(`^${prefix}[-_ ]?\\d`, "i").test(name)) return { bad: true };
  return null;
}

const field = (head, label) => {
  const m = new RegExp(`\\*\\*(?:${label}):\\*\\*\\s*([^\\n·]*)`, "iu").exec(head);
  return m ? m[1].replace(/\*\*/g, "").trim() : undefined;
};

function normStatus(s) {
  if (s === undefined) return undefined;
  const v = s.toLowerCase().replace(/[.*_]/g, "").trim();
  if (v === "active" || v === "действует") return "active"; // compat: «действует»
  // "revoked" or "revoked — folded into DEC-0030" (an explanation after the dash); compat: «отменён»
  if (/^(?:revoked|отмен[её]н[оа]?)(\s+[—–-]\s+\S.*)?$/u.test(v)) return "revoked";
  return "bad";
}

/** An old ADR (by the standard, with "Superseded"): the status and date — a line, the section "## Status" or in the front matter. */
// compat: the Russian words of such ADRs (Статус, Дата, Решение, заменён …) are read next to the English ones.
function parseLegacy(text, doc) {
  const fm = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1] ?? "";
  const fmField = (k) => new RegExp(`^${k}:\\s*["']?(.+?)["']?\\s*$`, "mi").exec(fm)?.[1];
  const lineField = (k) => new RegExp(`^\\s*(?:[-*]\\s*)?(?:${k})\\s*:\\s*(.+?)\\s*$`, "mi").exec(doc.head)?.[1];
  const sec = doc.sections.find((s) => /^(status|статус)$/i.test(s.name)); // compat
  const status = fmField("status") ?? lineField("Статус|Status") ?? sec?.body.split("\n").map((x) => x.trim()).find(Boolean); // compat
  if (!status) return null;
  const date = (fmField("date") ?? lineField("Дата|Date") ?? "").match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? ""; // compat
  const title = (fmField("title") ?? doc.title ?? "").replace(/^ADR[-\s]?\d+\s*[:.·—–-]?\s*/i, "").replace(/^\d+\.\s*/, "").trim();
  const decision = doc.sections.find((s) => /^(решение|decision|decision outcome)(?=$|[\s(:])/i.test(s.name)); // compat
  const revoked = /superseded|deprecated|rejected|заменён|заменен|отменён|отменен|отклонён|отклонен/i.test(status); // compat
  return { status: revoked ? "revoked" : "active", statusRaw: status.replace(/\*\*/g, "").trim(), date, question: title, summary: summaryOf(decision?.body ?? "") };
}

/** A decision file → { id, format: new | legacy | none, question, header fields, sections, gist }. */
export function parseDecision(raw, file, prefix, info = nameInfo(file, prefix)) {
  const text = stripComments(norm(raw));
  const doc = splitDoc(text);
  const d = { file, raw, id: info.id, num: info.num, nameStyle: info.style, sections: doc.sections, title: doc.title };
  const t = doc.title && /^([A-Z]{3}-\d{4})\s*[·:—–]\s*(.*)$/.exec(doc.title);
  d.titleId = t?.[1];
  d.question = (t?.[2] ?? doc.title ?? "").trim();
  if (field(doc.head, LABEL.status) !== undefined) {
    d.format = "new";
    d.statusRaw = field(doc.head, LABEL.status);
    d.status = normStatus(d.statusRaw);
    d.accepted = field(doc.head, LABEL.accepted);
    d.changed = field(doc.head, LABEL.changed);
    const tpl = field(doc.head, LABEL.template)?.toLowerCase();
    d.template = Object.hasOwn(TEMPLATE_NAMES, tpl) ? TEMPLATE_NAMES[tpl] : tpl; // canonical full | minimal; an unknown value stays as written (the check refuses it)
    const h = new RegExp(`\\*\\*(?:${LABEL.history}):\\*\\*\\s*(.*)`, "iu").exec(doc.head)?.[1] ?? null;
    d.historyLink = h === null ? undefined : (/\]\(([^)\s]+)\)/.exec(h)?.[1] ?? /`([^`]+)`/.exec(h)?.[1] ?? h.trim());
    d.summary = summaryOf(doc.sections.find((s) => canonSection(s.name) === "Decision")?.body);
    d.date = isDate(d.changed) ? d.changed : (d.accepted ?? "");
    return d;
  }
  const legacy = prefix === "ADR" ? parseLegacy(text, doc) : null;
  if (legacy) return Object.assign(d, legacy, { format: "legacy" });
  d.format = "none";
  d.summary = summaryOf(doc.sections.find((s) => canonSection(s.name) === "Decision")?.body);
  return d;
}

/** The "Was" quote: the lines "> …" after the label, without one level of ">" — the previous text as it was written. */
const quoted = (text) => norm(text).split("\n").slice(1).filter((l) => /^\s*>/.test(l)).map((l) => l.replace(/^\s*>\s?/, "")).join("\n");
/** For comparing "Was" with the previous text: without HTML comments and without spaces at all (line breaks and indents do not count). */
const bare = (s) => stripComments(norm(s)).replace(/\s+/g, "");

/** A history → { titleId, entries: [{ date, author, kind, why, was, wasText, block }], bad: [headings not by the pattern] }; kind is English (accepted | changed | revoked) whatever form is written. */
export function parseHistory(raw) {
  const doc = splitDoc(stripComments(norm(raw)));
  const titleId = doc.title && /^([A-Z]{3}-\d{4})\b/.exec(doc.title)?.[1];
  const entries = [];
  const bad = [];
  for (const s of doc.sections) {
    const m = /^(\S+)\s*·\s*(.*?)\s*·\s*(\S+)$/u.exec(s.name);
    const kind = m && Object.hasOwn(HISTORY_KINDS, m[3].toLowerCase()) ? HISTORY_KINDS[m[3].toLowerCase()] : undefined;
    if (!m || !isDate(m[1]) || !m[2] || !kind) { bad.push(s.name); continue; }
    const whyHit = WHY_RE.exec(s.body);
    const whyAt = whyHit ? whyHit.index : -1;
    const wasAt = s.body.search(WAS_RE);
    const whyText = whyAt < 0 ? "" : s.body.slice(whyAt + whyHit[0].length, wasAt > whyAt ? wasAt : undefined).trim();
    const wasText = wasAt < 0 ? "" : s.body.slice(wasAt);
    entries.push({
      date: m[1], author: m[2], kind,
      why: !!whyText,
      was: /^\s*>\s*\S/m.test(wasText),
      wasText: wasAt < 0 ? null : quoted(wasText),
      block: same(`## ${s.name}\n${s.body}`),
    });
  }
  return { titleId, entries, bad };
}

// ---------- where to read from: the working copy or a git tree ----------

export function fsReader(dir) {
  return {
    list(sub = "") {
      const p = join(dir, sub);
      if (!existsSync(p) || !statSync(p).isDirectory()) return [];
      return readdirSync(p, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name).sort();
    },
    read(rel) {
      const p = join(dir, rel);
      return existsSync(p) && statSync(p).isFile() ? readFileSync(p, "utf8") : null;
    },
  };
}

/** The repository root and the folder path from the root; the folder may be missing on disk (then — from the nearest existing one). */
function gitLocate(dir) {
  let base = resolve(dir);
  const rest = [];
  while (!existsSync(base) && dirname(base) !== base) { rest.unshift(basename(base)); base = dirname(base); }
  const r = spawnSync("git", ["-C", base, "rev-parse", "--show-toplevel", "--show-prefix"], { encoding: "utf8" });
  if (r.status !== 0) throw new UsageError(`${dir} is not in a git repository, but --base and --head read git`);
  const [top, pre = ""] = r.stdout.split("\n");
  return { top, prefix: [pre.replace(/\/+$/, ""), ...rest].filter(Boolean).join("/") };
}

/** What to compare with for --base: the branch point of head from base (like the PR diff); no common history — base itself. */
export function mergeBase(dir, base, head = "HEAD") {
  const { top } = gitLocate(dir);
  const git = (...a) => spawnSync("git", ["-C", top, ...a], { encoding: "utf8" });
  if (git("rev-parse", "--verify", "--quiet", `${base}^{commit}`).status !== 0) throw new UsageError(`no such commit or branch: ${base}`);
  const r = git("merge-base", base, head);
  return r.status === 0 ? r.stdout.trim() : base;
}

/** The decisions folder in the tree of ref: two git calls for everything — the list of .md (the folder and history/) and their texts via cat-file --batch. */
export function gitReader(dir, ref) {
  const { top, prefix } = gitLocate(dir);
  const git = (args, input) => spawnSync("git", ["-C", top, "-c", "core.quotePath=false", ...args], { input, maxBuffer: 256 * 1024 * 1024 });
  if (git(["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]).status !== 0) throw new UsageError(`no such commit or branch: ${ref}`);
  const files = new Map(); // the path from the folder → the git object
  const ls = git(["ls-tree", "-r", "-z", ref, ...(prefix ? ["--", `${prefix}/`] : [])]);
  for (const e of ls.stdout.toString("utf8").split("\0").filter(Boolean)) {
    const [meta, p] = e.split("\t");
    const [, type, sha] = meta.split(" ");
    const rel = prefix ? p.slice(prefix.length + 1) : p;
    if (type === "blob" && rel.endsWith(".md") && /^(?:history\/)?[^/]+$/.test(rel)) files.set(rel, sha);
  }
  const texts = new Map();
  if (files.size) {
    const out = git(["cat-file", "--batch"], `${[...files.values()].join("\n")}\n`).stdout;
    let pos = 0;
    for (const rel of files.keys()) { // the answer is in the order of the request: "<sha> blob <size>\n<text>\n"
      const nl = out.indexOf(10, pos);
      const size = Number(out.subarray(pos, nl).toString().split(" ")[2]);
      texts.set(rel, out.subarray(nl + 1, nl + 1 + size).toString("utf8"));
      pos = nl + 1 + size + 1;
    }
  }
  return {
    list(sub = "") {
      const inSub = (rel) => (sub ? rel.startsWith(`${sub}/`) && !rel.slice(sub.length + 1).includes("/") : !rel.includes("/"));
      return [...files.keys()].filter(inSub).map((rel) => basename(rel)).sort();
    },
    read: (rel) => texts.get(rel) ?? null,
  };
}

/** All decisions of a folder (and their histories). err(file, text) — for names that look like a decision but not by the pattern. */
export function loadFolder(reader, prefix, err = () => {}) {
  const decisions = [];
  for (const name of reader.list("")) {
    const info = nameInfo(name, prefix);
    if (!info) continue;
    if (info.oldName) { err(name, `the name must be ${prefix}-NNNN-<slug>.md, but this is the former name (before DEC-0091): rename it to ${prefix}-${String(info.num).padStart(4, "0")}-<slug>.md and move it to the template with a history (templates/decisions/); the old form stays only for the project's ADR`); continue; }
    if (info.bad) { err(name, `the file name must be ${prefix}-NNNN-<slug>.md: four digits (from 0001) and a slug in Latin lower case with hyphens`); continue; }
    const d = parseDecision(reader.read(name), name, prefix, info);
    d.historyRaw = d.format === "legacy" ? null : reader.read(`history/${name}`);
    decisions.push(d);
  }
  decisions.sort((a, b) => a.num - b.num || a.file.localeCompare(b.file));
  return { decisions, historyFiles: reader.list("history").filter((n) => n.endsWith(".md")) };
}

// ---------- index ----------
/** Decision files (and histories) with git conflict markers: an index built from them would be garbage (repeats, cut "Decision" sections). Only at the start of a line: a lone "=======" is a heading underline. */
export function conflictFiles(reader, prefix) {
  const hit = [];
  for (const sub of ["", "history"]) for (const name of reader.list(sub)) {
    if (!nameInfo(name, prefix)) continue;
    const rel = sub ? `${sub}/${name}` : name, text = reader.read(rel) ?? "";
    if (/^<{7}( |$)/m.test(text) || /^>{7}( |$)/m.test(text)) hit.push(rel);
  }
  return hit;
}


const cell = (s) => (s || "—").replace(/\s+/g, " ").replace(/\|/g, "\\|").trim();

/** The frame words of the index tables. */
const FRAME_EN = { count: (a, r) => `Active: ${a} · revoked: ${r}.`, head: ["ID", "Question", "Gist", "Changed"], none: "_no active decisions_", revoked: "Revoked", rhead: ["ID", "Question", "Gist", "Revoked"] };
// compat (DEC-0105 §2.6): the Russian frame of the index that the AI kit wrote before DEC-0105 — only to recognise such a block as fresh
const FRAME_RU = { count: (a, r) => `Действуют: ${a} · отменены: ${r}.`, head: ["ID", "Вопрос", "Суть", "Изменено"], none: "_действующих решений нет_", revoked: "Отменённые", rhead: ["ID", "Вопрос", "Суть", "Отменено"] }; // compat

function renderFrame(decisions, f) {
  const shown = decisions.filter((d) => d.format !== "none" || d.titleId);
  const active = shown.filter((d) => d.status !== "revoked");
  const revoked = shown.filter((d) => d.status === "revoked");
  const question = (d) => (d.format === "legacy" && !/^accepted$/i.test(d.statusRaw) ? `${d.question} (${d.statusRaw})` : d.question);
  const row = (d) => `| [${d.id}](${d.file}) | ${cell(question(d))} | ${cell(d.summary)} | ${d.date || "—"} |`;
  const table = (h) => [`| ${h.join(" | ")} |`, "|---|---|---|---|"];
  const out = [f.count(active.length, revoked.length), ""];
  if (active.length) out.push(...table(f.head), ...active.map(row));
  else out.push(f.none);
  if (revoked.length) out.push("", `## ${f.revoked}`, "", ...table(f.rhead), ...revoked.map(row));
  return out.join("\n");
}

/** The index tables (the text between the markers), in English. */
export function renderIndex(decisions) {
  return renderFrame(decisions, FRAME_EN);
}

function readmeSkeleton(prefix) {
  return [
    `# ${KINDS[prefix].title}`,
    "",
    `The index is built by the AI kit script \`utils/decisions.mjs index\` — do not edit it by hand. A decision is a file \`${prefix}-NNNN-<slug>.md\` ("as decided now"), its history is \`history/<the same file>\`, newest entries first. A new decision takes the next number; to change a decision, edit the same file and add an entry on top of its history.`,
    "",
    BEGIN,
    END,
    "",
  ].join("\n");
}

/**
 * The new README text: the old one with the block between the markers replaced (no README — the skeleton); null — a README without markers.
 * Freshness (the process guard compares this text with the file byte by byte): a block that equals the former Russian frame with the same
 * content is "as it should be" and comes back unchanged — an AI kit update does not turn the projects' CI red (compat, DEC-0105 §2.6).
 * `{ write: true }` (the `index` command) always writes the English frame.
 */
export function buildReadme(existing, prefix, decisions, { write = false } = {}) {
  const base = existing ?? readmeSkeleton(prefix);
  if (!INDEX_RE.test(base)) return null;
  return base.replace(INDEX_RE, (all, mark) => {
    const ruBlock = `<!-- ${mark}:begin -->\n${renderFrame(decisions, FRAME_RU)}\n<!-- ${mark}:end -->`; // compat
    if (!write && all === ruBlock) return all; // compat: the Russian frame of the same content
    return `<!-- ${mark}:begin -->\n${renderIndex(decisions)}\n<!-- ${mark}:end -->`;
  });
}

export const nextId = (prefix, decisions) => `${prefix}-${String(Math.max(0, ...decisions.map((d) => d.num)) + 1).padStart(4, "0")}`;

// ---------- check ----------

function checkDecision(d, err) {
  const f = d.file;
  if (d.format === "legacy") return; // an old ADR: only the number, the removal and the links are checked
  if (d.format === "none") {
    err(f, `no header: "- **Status:**", "- **Accepted:** … · **Changed:** …", "- **Template:**", "- **History:**" (the templates are in templates/decisions/)`);
    return;
  }
  if (d.nameStyle !== "new") err(f, `the file name must be ${d.id}-<slug>.md (a slug in Latin lower case with hyphens)`);
  if (!d.titleId) err(f, `no title "# ${d.id} · <question>"`);
  else if (d.titleId !== d.id) err(f, `the title has ${d.titleId}, but the file name says ${d.id}`);
  else if (!d.question || HINT.test(d.question)) err(f, `the title has no question: "# ${d.id} · <question>"`);

  if (d.status === "bad") err(f, `status "${d.statusRaw}" — "active" or "revoked" is needed (with an explanation if you like: "revoked — folded into DEC-NNNN")`);
  if (d.accepted === undefined) err(f, "the header has no \"**Accepted:**\" (a date YYYY-MM-DD)");
  else if (!isDate(d.accepted)) err(f, `"Accepted: ${d.accepted}" — a date YYYY-MM-DD is needed`);
  if (d.changed === undefined) err(f, "the header has no \"**Changed:**\" (a date YYYY-MM-DD or \"—\")");
  else if (!isDash(d.changed) && !isDate(d.changed)) err(f, `"Changed: ${d.changed}" — a date YYYY-MM-DD or "—" is needed`);
  else if (isDate(d.changed) && isDate(d.accepted) && d.changed < d.accepted) err(f, `"Changed: ${d.changed}" is earlier than "Accepted: ${d.accepted}"`);
  if (d.template === undefined) err(f, "the header has no \"**Template:**\" (full or minimal)");
  else if (!Object.hasOwn(TEMPLATES, d.template)) err(f, `template "${d.template}" — "full" or "minimal" is needed`);
  if (d.historyLink === undefined) err(f, `the header has no "**History:**" — a link to history/${f}`);
  else if (d.historyLink !== `history/${f}`) err(f, `"History" leads to ${d.historyLink || "—"}, but history/${f} is needed`);

  const req = Object.hasOwn(TEMPLATES, d.template) ? TEMPLATES[d.template] : undefined;
  if (req) {
    const names = d.sections.map((s) => canonSection(s.name));
    const seen = new Set();
    for (const n of names) { if (seen.has(n) && TEMPLATES.full.includes(n)) err(f, `the section "${n}" is repeated`); seen.add(n); }
    for (const r of req) {
      const s = d.sections.find((x) => canonSection(x.name) === r);
      if (!s) err(f, `no section "## ${r}" (template "${d.template}")`);
      else if (!stripComments(s.body).trim()) err(f, `the section "${r}" is empty`);
    }
    const present = names.filter((n, i) => req.includes(n) && names.indexOf(n) === i);
    if (present.join("|") !== req.filter((r) => present.includes(r)).join("|")) err(f, `the sections are not in the template order: ${req.join(" → ")}`);
    if (d.template === "minimal" && names.includes("Options")) err(f, "the section \"Options\" is only in the \"full\" template: change \"Template\" in the header");
  }
  const hints = findHints(d.raw);
  if (hints.length) err(f, `template hints left (${hints.length}): "${hints[0]}"${hints.length > 1 ? " …" : ""}`);

  // the history
  const hf = `history/${f}`;
  if (d.historyRaw === null) { err(f, `no history file ${hf} (the template is templates/decisions/history.md)`); return; }
  const h = parseHistory(d.historyRaw);
  if (!h.titleId) err(hf, `no title "# ${d.id} · <question> — history"`);
  else if (h.titleId !== d.id) err(hf, `the title has ${h.titleId}, but the decision is ${d.id}`);
  for (const b of h.bad) err(hf, `the entry "## ${b}" must be "## YYYY-MM-DD · author · accepted | changed | revoked"`);
  const hHints = findHints(d.historyRaw);
  if (hHints.length) err(hf, `template hints left (${hHints.length}): "${hHints[0]}"${hHints.length > 1 ? " …" : ""}`);
  const e = h.entries;
  if (!e.length) { err(hf, "no entries — at least \"## YYYY-MM-DD · author · accepted\" is needed"); return; }
  for (let i = 1; i < e.length; i++) if (e[i].date > e[i - 1].date) err(hf, `the entries are out of order: ${e[i - 1].date} is above ${e[i].date} — newest entries first`);
  for (const x of e) {
    if (!x.why) err(hf, `entry ${x.date} · ${x.kind}: no "**Why:**"`);
    if (x.kind === "changed" && !x.was) err(hf, `entry ${x.date} · changed: no "**Was (before YYYY-MM-DD):**" with the full previous text in a quote ("> …")`);
  }
  const accepted = e.filter((x) => x.kind === "accepted");
  const bottom = e[e.length - 1];
  if (accepted.length !== 1 || bottom.kind !== "accepted") err(hf, "the \"accepted\" entry must be one and the bottom one");
  else if (isDate(d.accepted) && bottom.date !== d.accepted) err(hf, `"accepted" is ${bottom.date}, but the header of the decision says "Accepted: ${d.accepted}"`);
  const top = e[0];
  const changed = isDate(d.changed) ? d.changed : null;
  if (!changed && e.length > 1) err(f, `the history has edits — the header "Changed:" needs the date of the top entry (${top.date})`);
  else if (changed && e.length === 1) err(f, `"Changed: ${changed}", but the history has no edits — a "changed" entry on top or "Changed: —"`);
  else if (changed && top.date !== changed) err(f, `"Changed: ${changed}", but the top history entry is ${top.date}`);
  if (d.status === "revoked" && top.kind !== "revoked") err(f, "status \"revoked\" — a \"revoked\" entry is needed on top of the history");
  if (d.status === "active" && top.kind === "revoked") err(f, "the top history entry is \"revoked\", but the status is \"active\"");
}

const REF = /\b(DEC|ADR|ATD)-(\d{4})\b/g;

function checkLinks(cur, prefix, linked, err, notes) {
  const known = { [prefix]: new Set(cur.decisions.map((d) => d.id)), ...linked };
  const unchecked = new Set();
  for (const d of cur.decisions) {
    if (d.format === "legacy") continue; // an old ADR by the standard stays as it is: its links are not checked (links to it are)
    for (const [file, text] of [[d.file, d.raw], [`history/${d.file}`, d.historyRaw]]) {
      if (!text) continue;
      const missing = new Set();
      for (const [ref, kind] of stripComments(norm(text)).matchAll(REF)) {
        if (!known[kind]) unchecked.add(kind);
        else if (!known[kind].has(ref)) missing.add(ref);
      }
      for (const ref of missing) err(file, `the link to ${ref} — there is no such decision`);
    }
  }
  // The process guard drops this note for DEC by the text "DEC-NNNN" (a project has no DEC): keep "<KIND>-NNNN" in it.
  for (const k of [...unchecked].sort()) notes.push(`links to ${k}-NNNN are not checked — pass --link ${k}=<folder>`);
}

/** The slug from a file name: "ADR-0005-use-pg.md", "0005-use-pg.md" → "use-pg". */
const slugOf = (file) => file.replace(/\.md$/, "").replace(/^(?:[A-Z]{3}-|adr-)?\d{3,4}-/i, "");

/**
 * A repeated number. dupes = "new" (K21) and a base exists: an error only for the files that are not in base (new in the PR), — so
 * only the PR that brings a repeat turns red; a repeat among the old ones (two PRs merged with one number) is a note.
 */
function checkDupes(cur, base, { dupes, baseRef }, err, notes) {
  const byId = new Map();
  for (const d of cur.decisions) (byId.get(d.id) ?? byId.set(d.id, []).get(d.id)).push(d.file);
  const old = new Set(base?.decisions.map((d) => d.file) ?? []);
  for (const [id, files] of byId) {
    if (files.length < 2) continue;
    if (dupes !== "new" || !base) { for (const f of files.slice(1)) err(f, `${id} is repeated (also in ${files[0]}) — give the second decision the next free number`); continue; }
    const fresh = files.filter((f) => !old.has(f));
    if (!fresh.length) { notes.push(`${id} is repeated (${files.join(", ")}) — it is already so in ${baseRef}, not in this PR: give the second one the next free number in a separate PR`); continue; }
    for (const f of fresh) err(f, `${id} is already taken (${files.filter((x) => x !== f).join(", ")}) — take the next free number and fix the links`);
  }
}

function checkBase(cur, base, ref, err) {
  const curByFile = new Map(cur.decisions.map((d) => [d.file, d]));
  const curById = new Map();
  for (const d of cur.decisions) if (!curById.has(d.id)) curById.set(d.id, d);
  const baseFiles = new Set(base.decisions.map((d) => d.file));
  const baseIds = new Map();
  for (const b of base.decisions) baseIds.set(b.id, (baseIds.get(b.id) ?? 0) + 1);
  const matched = new Set();
  for (const b of base.decisions) {
    // The same file; otherwise the same number (the slug was renamed); the number was repeated in base — the same slug under a new number (K21).
    let c = curByFile.get(b.file);
    if (!c && baseIds.get(b.id) === 1) c = curById.get(b.id);
    if (!c && baseIds.get(b.id) > 1) c = cur.decisions.find((d) => !baseFiles.has(d.file) && slugOf(d.file) === slugOf(b.file));
    if (!c) { err(b.file, `${b.id} was deleted (it is in ${ref}) — decisions cannot be deleted: to revoke, set the status "revoked" and add a "revoked" entry to the history`); continue; }
    matched.add(c);
    // HTML comments are not the text of a decision: editing them needs no history entry.
    const changed = same(stripComments(norm(b.raw))) !== same(stripComments(norm(c.raw)));
    if (c.format === "legacy") {
      if (changed) err(c.file, `the old ADR ${c.id} was changed (against ${ref}) — the edit goes by the new rule: move the file to the template (header, sections) and start a history (templates/decisions/)`);
      continue;
    }
    if (c.format !== "new" || c.historyRaw === null) continue; // the error is already recorded
    const was = b.format === "new" && b.historyRaw ? parseHistory(b.historyRaw).entries.map((x) => x.block) : [];
    const entries = parseHistory(c.historyRaw).entries;
    const now = entries.map((x) => x.block);
    const tail = now.slice(now.length - was.length);
    if (was.length > now.length || was.some((x, i) => x !== tail[i])) { err(`history/${c.file}`, `earlier history entries were changed or removed (against ${ref}) — they are not edited; a new entry goes on top`); continue; }
    if (changed && now.length === was.length) { err(c.file, `the decision changed (against ${ref}), but there is no new entry in the history — add "## YYYY-MM-DD · author · changed" on top, with "Why" and "Was"`); continue; }
    // The "Was" of the new entry right above the old ones is the whole previous text of the decision from the base (spaces and comments do not count).
    // A decision of the new kind was in the base and changed; moving an old ADR to the template ("accepted" at the bottom) is not an edit.
    const first = entries[now.length - was.length - 1];
    if (changed && b.format === "new" && first?.kind === "changed" && first.wasText !== null && first.was && bare(first.wasText) !== bare(b.raw)) {
      err(`history/${c.file}`, `entry ${first.date} · changed: "Was" is not the previous text of the decision (against ${ref}): the quote "> …" must hold the whole file as it was before the edit, without cuts (spaces and line breaks do not count)`);
    }
  }
  // The old form (Accepted / Superseded, no header and no history) stays only for the ADRs that were already in the base (DEC-0091, rule 7).
  for (const c of cur.decisions) {
    if (c.format === "legacy" && !matched.has(c)) err(c.file, `a new ADR in the old form (status "${c.statusRaw}", no header and no history) — new decisions only by the template: header, sections, history (templates/decisions/, in a project — 0000-template.md); the old form stays only for the ADRs that were already in ${ref}`);
  }
}

/**
 * All checks of a folder → { errors: [{ file, text }], notes, count, decisions }; file — the path from the decisions folder.
 * dupes: "all" — a repeated number is always an error; "new" — only for the files new against base (the project's process guard, K21).
 */
export function checkFolder({ reader, prefix, baseReader = null, baseRef = "", linkReaders = {}, dupes = "all" }) {
  const errors = [];
  const notes = [];
  const err = (file, text) => errors.push({ file, text });
  const cur = loadFolder(reader, prefix, err);
  const base = baseReader ? loadFolder(baseReader, prefix) : null;
  checkDupes(cur, base, { dupes, baseRef }, err, notes);
  for (const d of cur.decisions) checkDecision(d, err);
  const files = new Set(cur.decisions.map((d) => d.file));
  for (const h of cur.historyFiles) {
    const info = nameInfo(h, prefix);
    if (info && !info.bad && !files.has(h)) err(`history/${h}`, `a history without a decision — there is no file ${h}`);
  }
  const linked = {};
  for (const [kind, r] of Object.entries(linkReaders)) if (kind !== prefix) linked[kind] = new Set(loadFolder(r, kind).decisions.map((d) => d.id));
  checkLinks(cur, prefix, linked, err, notes);
  if (base) checkBase(cur, base, baseRef, err);
  return { errors, notes, count: cur.decisions.length, decisions: cur.decisions };
}

// ---------- CLI ----------

// The script path as it is called from here: utils/decisions.mjs in the AI kit, .github/ai-team/decisions.mjs in a project (the same copy).
const SELF = relative(process.cwd(), SCRIPT) || SCRIPT;
const USAGE = `Decisions DEC, ADR, ATD (DEC-0091): the index and the checks.

  node ${SELF} index <folder> --prefix DEC|ADR|ATD [--check]
  node ${SELF} check <folder> --prefix DEC|ADR|ATD [--base <ref>] [--head <ref>] [--link <KIND>=<folder>]…

index          build <folder>/README.md (the active ones, the revoked ones below); --check — only compare.
check          the header, the template sections, the history, IDs, links; --base — a decision changed since the branch point
               from ref needs a new history entry ("Was" — the previous text), nothing can be deleted, a new ADR — only
               by the template, a repeated number — only for new files;
               --head — check the tree of ref, not the working copy; --link — the folder of the decisions of another kind.
Exit code: 0 — all is well, 1 — errors.`;

function parseArgs(argv) {
  const [cmd, dir, ...rest] = argv;
  if (!["index", "check"].includes(cmd)) throw new UsageError(cmd ? `unknown command: ${cmd}` : "a command is needed: index or check");
  if (!dir || dir.startsWith("--")) throw new UsageError("a decisions folder is needed");
  const o = { cmd, dir, links: {} };
  for (let i = 0; i < rest.length; i++) {
    let [a, v] = rest[i].split(/=(.*)/s);
    if (a === "--check") { o.check = true; continue; }
    if (!["--prefix", "--base", "--head", "--link"].includes(a)) throw new UsageError(`unknown argument: ${rest[i]}`);
    if (v === undefined) v = rest[++i];
    if (v === undefined || v === "") throw new UsageError(`${a}: a value is needed`);
    if (a === "--link") {
      const m = /^(DEC|ADR|ATD)=(.+)$/i.exec(v);
      if (!m) throw new UsageError(`--link ${v}: <KIND>=<folder> is needed, for example ADR=docs/adr`);
      o.links[m[1].toUpperCase()] = m[2];
    } else o[a.slice(2)] = v;
  }
  o.prefix = o.prefix?.toUpperCase();
  if (!KINDS[o.prefix]) throw new UsageError(`--prefix: DEC, ADR or ATD is needed${o.prefix ? `, not ${o.prefix}` : ""}`);
  if (cmd === "index" && (o.base || o.head || Object.keys(o.links).length)) throw new UsageError("--base, --head and --link are only for check");
  if (cmd === "check" && o.check) throw new UsageError("--check is only for index");
  if (!o.head && !(existsSync(o.dir) && statSync(o.dir).isDirectory())) throw new UsageError(`no folder ${o.dir}`);
  return o;
}

function main(argv) {
  if (argv.includes("-h") || argv.includes("--help")) { console.log(USAGE); return 0; }
  let o;
  try { o = parseArgs(argv); } catch (e) {
    if (!(e instanceof UsageError)) throw e;
    console.error(`${e.message}\n\n${USAGE}`);
    return 1;
  }
  const self = SELF;
  try {
    if (o.cmd === "index") {
      const file = join(o.dir, "README.md");
      const existing = existsSync(file) ? readFileSync(file, "utf8") : null;
      const conflicts = conflictFiles(fsReader(o.dir), o.prefix);
      if (conflicts.length) { console.error(`the index is not built: git conflict markers (<<<<<<<, >>>>>>>) are left in the decision files: ${conflicts.map((c) => join(o.dir, c)).join(", ")} — resolve the conflict and repeat`); return 1; }
      const { decisions } = loadFolder(fsReader(o.dir), o.prefix);
      const text = buildReadme(existing, o.prefix, decisions, { write: !o.check });
      if (text === null) { console.error(`${file}: no markers ${BEGIN} … ${END} (or the former <!-- ai-team:adr-index:begin/end -->) — put them where the index should be`); return 1; }
      if (o.check) {
        if (existing === text) { console.log(`${file} is up to date`); return 0; }
        console.log(`${file} ${existing === null ? "is missing" : "is stale"} — build it: node ${self} index ${o.dir} --prefix ${o.prefix}`);
        return 1;
      }
      if (existing !== text) writeFileSync(file, text);
      const revoked = decisions.filter((d) => d.status === "revoked").length;
      console.log(`${file} ${existing === text ? "is already up to date" : "built"}: active ${decisions.length - revoked}, revoked ${revoked}. The next number — ${nextId(o.prefix, decisions)}.`);
      return 0;
    }
    const reader = o.head ? gitReader(o.dir, o.head) : fsReader(o.dir);
    const baseReader = o.base ? gitReader(o.dir, mergeBase(o.dir, o.base, o.head)) : null;
    const linkReaders = Object.fromEntries(Object.entries(o.links).map(([k, p]) => [k, o.head ? gitReader(p, o.head) : fsReader(p)]));
    // With --base a repeated number is an error only for files new against the base (K21): a repeat merged earlier is a note.
    const r = checkFolder({ reader, prefix: o.prefix, baseReader, baseRef: o.base, linkReaders, dupes: o.base ? "new" : "all" });
    // By file: the decision, then its history; inside a file — in the order of the checks.
    const key = (f) => `${f.replace(/^history\//, "")}\0${f.startsWith("history/") ? 1 : 0}`;
    const sorted = [...r.errors].sort((a, b) => (key(a.file) < key(b.file) ? -1 : key(a.file) > key(b.file) ? 1 : 0));
    for (const e of sorted) console.log(`${join(o.dir, e.file)}: ${e.text}`);
    for (const n of r.notes) console.log(`note: ${n}`);
    const where = `${o.prefix} in ${o.dir}${o.head ? ` (${o.head})` : ""}${o.base ? `, base ${o.base}` : ""}`;
    console.log(r.errors.length ? `Decisions ${where}: ${r.count}, errors: ${r.errors.length}.` : `Decisions ${where}: ${r.count}, no errors.`);
    return r.errors.length ? 1 : 0;
  } catch (e) {
    if (!(e instanceof UsageError)) throw e;
    console.error(e.message);
    return 1;
  }
}

const isMain = (() => { try { return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(SCRIPT); } catch { return false; } })();
if (isMain) process.exitCode = main(process.argv.slice(2));

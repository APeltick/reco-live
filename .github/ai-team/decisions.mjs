#!/usr/bin/env node
// Решения трёх видов (DEC-0091): DEC — флоу AI kit, ADR — решения проекта, ATD — работа AI team в проекте.
// Решение — файл «как решено сейчас» (<ID>-<slug>.md), рядом история history/<тот же файл>: новые записи сверху.
// Один скрипт и одни шаблоны (templates/decisions/) на три вида: у вида меняются папка и префикс.
// Только Node ≥ 22, без зависимостей и без библиотек AI kit — файл можно скопировать в проект как есть.
//
//   node utils/decisions.mjs index <папка> --prefix DEC|ADR|ATD [--check]
//   node utils/decisions.mjs check <папка> --prefix DEC|ADR|ATD [--base <ref>] [--head <ref>] [--link <ВИД>=<папка>]…
// Копия в проекте — .github/ai-team/decisions.mjs (её зовёт process guard в CI проекта, без AI kit); копия = этот файл.
//
// index           собрать <папка>/README.md: действующие (ID · вопрос · суть · изменено), ниже — отменённые;
//                 суть — первое предложение раздела «Решение». Пишет только между метками индекса.
//   --check       не писать, а сверить: README актуален — код 0, иначе 1.
// check           шапка и разделы шаблона, история (записи новые сверху), ID и имена файлов, ссылки DEC-/ADR-/ATD-NNNN;
//                 прежнее имя NNNN-<slug>.md у DEC и ATD — ошибка (старый вид — только у ADR проекта).
//   --base <ref>  решение, которое уже было в точке ответвления от <ref> (merge-base, как дифф PR), изменилось —
//                 сверху в истории нужна новая запись, её «Было» — прежний текст из базы (пробелы не в счёт); правка
//                 HTML-комментария — не правка; прежние записи истории не правятся; удалять решения нельзя; новый ADR
//                 в старом виде — ошибка (старый вид — только у ADR, которые были в базе);
//                 повтор номера — ошибка только у файлов, которых в базе нет (уже влитый повтор — примечание).
//   --head <ref>  проверять не рабочую копию, а дерево <ref> (gate, CI).
//   --link <ВИД>=<папка>  где лежат решения другого вида — для проверки ссылок на них (без этого не проверяются).
// Код возврата: 0 — всё в порядке, 1 — ошибки (или неверный вызов).
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const KINDS = {
  DEC: { title: "Решения AI kit (DEC)" },
  ADR: { title: "Решения проекта (ADR)" },
  ATD: { title: "Решения о работе AI team (ATD)" },
};
// Разделы шаблонов — в порядке шаблона (templates/decisions/full.md, minimal.md).
export const TEMPLATES = {
  "полный": ["Почему", "Варианты", "Решение", "Что из этого следует", "Связанные"],
  "минимум": ["Почему", "Решение", "Что из этого следует"],
};
const SECTION_ALIASES = { "что следует": "Что из этого следует" };
const HISTORY_KINDS = ["принято", "изменено", "отменено"];
const BEGIN = "<!-- decisions-index:begin -->";
const END = "<!-- decisions-index:end -->";
// Прежние метки индекса ADR в проектах (ai-team:adr-index, до DEC-0091) тоже понимаются и остаются как есть.
const INDEX_RE = /<!-- (decisions-index|ai-team:adr-index):begin -->[\s\S]*?<!-- \1:end -->/;
const SCRIPT = fileURLToPath(import.meta.url);

class UsageError extends Error {}

// ---------- markdown ----------

const norm = (s) => String(s ?? "").replace(/\r\n?/g, "\n");
const stripComments = (s) => s.replace(/<!--[\s\S]*?-->/g, "");
/** Для сравнения версий: концы строк и хвостовые пробелы не в счёт. */
const same = (s) => norm(s).split("\n").map((l) => l.trimEnd()).join("\n").trim();
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s ?? "") && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);
const isDash = (s) => /^[—–-]?$/.test((s ?? "").trim());

/** Строки с пометкой «внутри блока кода» (``` и ~~~). */
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

/** Заголовок «# …», текст до первого «## » (шапка) и разделы «## …» вне блоков кода. */
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
  return SECTION_ALIASES[n.toLowerCase()] ?? n;
};

/** Подсказка шаблона: целая строка (или ячейка таблицы, или значение после «**Поле:**») в угловых скобках. */
const HINT = /^<[^<>]*[\s\u0400-\u04ff…][^<>]*>[.,;:]?$/;
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

// ---------- суть: первое предложение ----------

const ABBR = /(?:^|[\s(«".])(?:[a-zа-яё]|см|напр|др|стр|рис|гл|ср|англ|e\.g|i\.e|etc|vs)$/i;

/** Первое предложение абзаца: конец — «.», «!», «?» или «…» перед пробелом; код в `…` и сокращения («т. е.») не режут. */
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

/** Первый абзац текста (или первый пункт списка) без маркера списка; таблицы и блоки кода пропускаются. */
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

/** Суть решения одной фразой — первое предложение раздела; если оно только жирная метка («**Журнал ввода.**») — с продолжением. */
export function summaryOf(body) {
  const p = firstParagraph(body ?? "");
  if (!p) return "";
  const { sentence, rest } = firstSentence(p);
  if (/^\*\*[^*]+\*\*$/.test(sentence) && rest) return `${sentence} ${firstSentence(rest).sentence}`;
  return sentence;
}

// ---------- разбор файлов ----------

/**
 * Что за файл по имени: решение нового вида, старый ADR (NNNN-<slug>.md), «похоже, но имя неверное» или не решение.
 * Прежнее имя NNNN-<slug>.md у ATD и DEC — не решение старого вида, а неверное имя (oldName, num — номер из имени):
 * старый вид остаётся только у ADR проекта (DEC-0091). Шаблон 0000 — не решение.
 */
export function nameInfo(name, prefix) {
  if (!name.endsWith(".md") || name === "README.md") return null;
  // Шаблон AI kit (RB42; decision-paths.mjs → TEMPLATE_NAMES): 0000-template.md и его имена с префиксом — не решение, не ошибка имени.
  if (/^(?:(?:ADR|ATD|DEC)-)?0000-template\.md$/.test(name)) return null;
  const m = new RegExp(`^${prefix}-(\\d{4})-([a-z0-9]+(?:-[a-z0-9]+)*)\\.md$`).exec(name);
  if (m && +m[1] > 0) return { id: `${prefix}-${m[1]}`, num: +m[1], style: "new" };
  // «adr-NNNN-…» — прежнее имя в любом регистре только у ADR; у ATD и DEC «ADR-NNNN-…» — чужое решение, не прежнее имя.
  const l = (prefix === "ADR" ? /^(?:adr-)?(\d{3,4})-.+\.md$/i : /^(?:adr-)?(\d{3,4})-.+\.md$/).exec(name);
  if (l && +l[1] > 0) return prefix === "ADR" ? { id: `ADR-${l[1].padStart(4, "0")}`, num: +l[1], style: "legacy" } : { bad: true, oldName: true, num: +l[1] };
  if (new RegExp(`^${prefix}[-_ ]?\\d`, "i").test(name)) return { bad: true };
  return null;
}

const field = (head, label) => {
  const m = new RegExp(`\\*\\*${label}:\\*\\*\\s*([^\\n·]*)`, "iu").exec(head);
  return m ? m[1].replace(/\*\*/g, "").trim() : undefined;
};

function normStatus(s) {
  if (s === undefined) return undefined;
  const v = s.toLowerCase().replace(/[.*_]/g, "").trim();
  if (v === "действует") return "active";
  // «отменён» или «отменён — свёрнуто в DEC-0030» (пояснение после тире)
  if (/^отмен[её]н[оа]?(\s+[—–-]\s+\S.*)?$/u.test(v)) return "revoked";
  return "bad";
}

/** Старый ADR (по стандарту, со «Superseded»): статус и дата — строкой, разделом «## Status» или во front matter. */
function parseLegacy(text, doc) {
  const fm = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1] ?? "";
  const fmField = (k) => new RegExp(`^${k}:\\s*["']?(.+?)["']?\\s*$`, "mi").exec(fm)?.[1];
  const lineField = (k) => new RegExp(`^\\s*(?:[-*]\\s*)?(?:${k})\\s*:\\s*(.+?)\\s*$`, "mi").exec(doc.head)?.[1];
  const sec = doc.sections.find((s) => /^(status|статус)$/i.test(s.name));
  const status = fmField("status") ?? lineField("Статус|Status") ?? sec?.body.split("\n").map((x) => x.trim()).find(Boolean);
  if (!status) return null;
  const date = (fmField("date") ?? lineField("Дата|Date") ?? "").match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? "";
  const title = (fmField("title") ?? doc.title ?? "").replace(/^ADR[-\s]?\d+\s*[:.·—–-]?\s*/i, "").replace(/^\d+\.\s*/, "").trim();
  const decision = doc.sections.find((s) => /^(решение|decision|decision outcome)(?=$|[\s(:])/i.test(s.name));
  const revoked = /superseded|deprecated|rejected|заменён|заменен|отменён|отменен|отклонён|отклонен/i.test(status);
  return { status: revoked ? "revoked" : "active", statusRaw: status.replace(/\*\*/g, "").trim(), date, question: title, summary: summaryOf(decision?.body ?? "") };
}

/** Файл решения → { id, format: new | legacy | none, вопрос, поля шапки, разделы, суть }. */
export function parseDecision(raw, file, prefix, info = nameInfo(file, prefix)) {
  const text = stripComments(norm(raw));
  const doc = splitDoc(text);
  const d = { file, raw, id: info.id, num: info.num, nameStyle: info.style, sections: doc.sections, title: doc.title };
  const t = doc.title && /^([A-Z]{3}-\d{4})\s*[·:—–]\s*(.*)$/.exec(doc.title);
  d.titleId = t?.[1];
  d.question = (t?.[2] ?? doc.title ?? "").trim();
  if (field(doc.head, "Статус") !== undefined) {
    d.format = "new";
    d.statusRaw = field(doc.head, "Статус");
    d.status = normStatus(d.statusRaw);
    d.accepted = field(doc.head, "Принято");
    d.changed = field(doc.head, "Изменено");
    d.template = field(doc.head, "Шаблон")?.toLowerCase();
    const h = /\*\*История:\*\*\s*(.*)/iu.exec(doc.head)?.[1] ?? null;
    d.historyLink = h === null ? undefined : (/\]\(([^)\s]+)\)/.exec(h)?.[1] ?? /`([^`]+)`/.exec(h)?.[1] ?? h.trim());
    d.summary = summaryOf(doc.sections.find((s) => canonSection(s.name) === "Решение")?.body);
    d.date = isDate(d.changed) ? d.changed : (d.accepted ?? "");
    return d;
  }
  const legacy = prefix === "ADR" ? parseLegacy(text, doc) : null;
  if (legacy) return Object.assign(d, legacy, { format: "legacy" });
  d.format = "none";
  d.summary = summaryOf(doc.sections.find((s) => canonSection(s.name) === "Решение")?.body);
  return d;
}

/** Цитата «Было»: строки «> …» после метки, без одного уровня «>» — прежний текст, как его записали. */
const quoted = (text) => norm(text).split("\n").slice(1).filter((l) => /^\s*>/.test(l)).map((l) => l.replace(/^\s*>\s?/, "")).join("\n");
/** Для сверки «Было» с прежним текстом: без HTML-комментариев и без пробелов вовсе (перенос строк и отступы не в счёт). */
const bare = (s) => stripComments(norm(s)).replace(/\s+/g, "");

/** История → { titleId, entries: [{ date, author, kind, why, was, wasText, block }], bad: [заголовки не по образцу] }. */
export function parseHistory(raw) {
  const doc = splitDoc(stripComments(norm(raw)));
  const titleId = doc.title && /^([A-Z]{3}-\d{4})\b/.exec(doc.title)?.[1];
  const entries = [];
  const bad = [];
  for (const s of doc.sections) {
    const m = /^(\S+)\s*·\s*(.*?)\s*·\s*(\S+)$/u.exec(s.name);
    const kind = m?.[3].toLowerCase();
    if (!m || !isDate(m[1]) || !m[2] || !HISTORY_KINDS.includes(kind)) { bad.push(s.name); continue; }
    const whyAt = s.body.search(/\*\*Почему:\*\*/u);
    const wasAt = s.body.search(/\*\*Было[^*\n]*\*\*/u);
    const whyText = whyAt < 0 ? "" : s.body.slice(whyAt + "**Почему:**".length, wasAt > whyAt ? wasAt : undefined).trim();
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

// ---------- откуда читать: рабочая копия или дерево git ----------

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

/** Корень репозитория и путь папки от корня; папки может не быть на диске (тогда — от ближайшей существующей). */
function gitLocate(dir) {
  let base = resolve(dir);
  const rest = [];
  while (!existsSync(base) && dirname(base) !== base) { rest.unshift(basename(base)); base = dirname(base); }
  const r = spawnSync("git", ["-C", base, "rev-parse", "--show-toplevel", "--show-prefix"], { encoding: "utf8" });
  if (r.status !== 0) throw new UsageError(`${dir} — не в git-репозитории, а --base и --head читают git`);
  const [top, pre = ""] = r.stdout.split("\n");
  return { top, prefix: [pre.replace(/\/+$/, ""), ...rest].filter(Boolean).join("/") };
}

/** С чем сравнивать для --base: точка ответвления head от base (как дифф PR); нет общей истории — сам base. */
export function mergeBase(dir, base, head = "HEAD") {
  const { top } = gitLocate(dir);
  const git = (...a) => spawnSync("git", ["-C", top, ...a], { encoding: "utf8" });
  if (git("rev-parse", "--verify", "--quiet", `${base}^{commit}`).status !== 0) throw new UsageError(`нет такого коммита или ветки: ${base}`);
  const r = git("merge-base", base, head);
  return r.status === 0 ? r.stdout.trim() : base;
}

/** Папка решений в дереве ref: два вызова git на всё — список .md (папка и history/) и их тексты через cat-file --batch. */
export function gitReader(dir, ref) {
  const { top, prefix } = gitLocate(dir);
  const git = (args, input) => spawnSync("git", ["-C", top, "-c", "core.quotePath=false", ...args], { input, maxBuffer: 256 * 1024 * 1024 });
  if (git(["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]).status !== 0) throw new UsageError(`нет такого коммита или ветки: ${ref}`);
  const files = new Map(); // путь от папки → объект git
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
    for (const rel of files.keys()) { // ответ — в порядке запроса: «<sha> blob <size>\n<текст>\n»
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

/** Все решения папки (и их истории). err(файл, текст) — для имён, которые похожи на решение, но не по образцу. */
export function loadFolder(reader, prefix, err = () => {}) {
  const decisions = [];
  for (const name of reader.list("")) {
    const info = nameInfo(name, prefix);
    if (!info) continue;
    if (info.oldName) { err(name, `имя — ${prefix}-NNNN-<slug>.md, а это прежнее имя (до DEC-0091): переименуйте в ${prefix}-${String(info.num).padStart(4, "0")}-<slug>.md и переведите в шаблон с историей (templates/decisions/); старый вид остаётся только у ADR проекта`); continue; }
    if (info.bad) { err(name, `имя файла — ${prefix}-NNNN-<slug>.md: четыре цифры (с 0001) и slug латиницей в нижнем регистре через дефис`); continue; }
    const d = parseDecision(reader.read(name), name, prefix, info);
    d.historyRaw = d.format === "legacy" ? null : reader.read(`history/${name}`);
    decisions.push(d);
  }
  decisions.sort((a, b) => a.num - b.num || a.file.localeCompare(b.file));
  return { decisions, historyFiles: reader.list("history").filter((n) => n.endsWith(".md")) };
}

// ---------- index ----------

const cell = (s) => (s || "—").replace(/\s+/g, " ").replace(/\|/g, "\\|").trim();

/** Таблицы индекса (текст между метками). */
export function renderIndex(decisions) {
  const shown = decisions.filter((d) => d.format !== "none" || d.titleId);
  const active = shown.filter((d) => d.status !== "revoked");
  const revoked = shown.filter((d) => d.status === "revoked");
  const question = (d) => (d.format === "legacy" && !/^accepted$/i.test(d.statusRaw) ? `${d.question} (${d.statusRaw})` : d.question);
  const row = (d) => `| [${d.id}](${d.file}) | ${cell(question(d))} | ${cell(d.summary)} | ${d.date || "—"} |`;
  const out = [`Действуют: ${active.length} · отменены: ${revoked.length}.`, ""];
  if (active.length) out.push("| ID | Вопрос | Суть | Изменено |", "|---|---|---|---|", ...active.map(row));
  else out.push("_действующих решений нет_");
  if (revoked.length) out.push("", "## Отменённые", "", "| ID | Вопрос | Суть | Отменено |", "|---|---|---|---|", ...revoked.map(row));
  return out.join("\n");
}

function readmeSkeleton(prefix) {
  return [
    `# ${KINDS[prefix].title}`,
    "",
    `Индекс собирает скрипт AI kit \`utils/decisions.mjs index\` — руками не править. Решение — файл \`${prefix}-NNNN-<slug>.md\` («как решено сейчас»), его история — \`history/<тот же файл>\`, новые записи сверху. Новое решение — следующий номер; поменять решение — правка того же файла и запись сверху в его истории.`,
    "",
    BEGIN,
    END,
    "",
  ].join("\n");
}

/** Новый текст README: старый с заменой блока между метками (нет README — заготовка); null — README без меток. */
export function buildReadme(existing, prefix, decisions) {
  const base = existing ?? readmeSkeleton(prefix);
  if (!INDEX_RE.test(base)) return null;
  return base.replace(INDEX_RE, (_all, mark) => `<!-- ${mark}:begin -->\n${renderIndex(decisions)}\n<!-- ${mark}:end -->`);
}

export const nextId = (prefix, decisions) => `${prefix}-${String(Math.max(0, ...decisions.map((d) => d.num)) + 1).padStart(4, "0")}`;

// ---------- check ----------

function checkDecision(d, err) {
  const f = d.file;
  if (d.format === "legacy") return; // старый ADR: проверяются только номер, удаление и ссылки
  if (d.format === "none") {
    err(f, `нет шапки: «- **Статус:**», «- **Принято:** … · **Изменено:** …», «- **Шаблон:**», «- **История:**» (шаблоны — templates/decisions/)`);
    return;
  }
  if (d.nameStyle !== "new") err(f, `имя файла — ${d.id}-<slug>.md (slug латиницей в нижнем регистре через дефис)`);
  if (!d.titleId) err(f, `нет заголовка «# ${d.id} · <вопрос>»`);
  else if (d.titleId !== d.id) err(f, `в заголовке ${d.titleId}, а по имени файла ${d.id}`);
  else if (!d.question || HINT.test(d.question)) err(f, `в заголовке нет вопроса: «# ${d.id} · <вопрос>»`);

  if (d.status === "bad") err(f, `статус «${d.statusRaw}» — нужно «действует» или «отменён» (можно с пояснением: «отменён — свёрнуто в DEC-NNNN»)`);
  if (d.accepted === undefined) err(f, "в шапке нет «**Принято:**» (дата ГГГГ-ММ-ДД)");
  else if (!isDate(d.accepted)) err(f, `«Принято: ${d.accepted}» — нужна дата ГГГГ-ММ-ДД`);
  if (d.changed === undefined) err(f, "в шапке нет «**Изменено:**» (дата ГГГГ-ММ-ДД или «—»)");
  else if (!isDash(d.changed) && !isDate(d.changed)) err(f, `«Изменено: ${d.changed}» — нужна дата ГГГГ-ММ-ДД или «—»`);
  else if (isDate(d.changed) && isDate(d.accepted) && d.changed < d.accepted) err(f, `«Изменено: ${d.changed}» раньше «Принято: ${d.accepted}»`);
  if (d.template === undefined) err(f, "в шапке нет «**Шаблон:**» (полный или минимум)");
  else if (!TEMPLATES[d.template]) err(f, `шаблон «${d.template}» — нужно «полный» или «минимум»`);
  if (d.historyLink === undefined) err(f, `в шапке нет «**История:**» — ссылка на history/${f}`);
  else if (d.historyLink !== `history/${f}`) err(f, `«История» ведёт на ${d.historyLink || "—"}, а нужно history/${f}`);

  const req = TEMPLATES[d.template];
  if (req) {
    const names = d.sections.map((s) => canonSection(s.name));
    const seen = new Set();
    for (const n of names) { if (seen.has(n) && TEMPLATES["полный"].includes(n)) err(f, `раздел «${n}» повторяется`); seen.add(n); }
    for (const r of req) {
      const s = d.sections.find((x) => canonSection(x.name) === r);
      if (!s) err(f, `нет раздела «## ${r}» (шаблон «${d.template}»)`);
      else if (!stripComments(s.body).trim()) err(f, `раздел «${r}» пустой`);
    }
    const present = names.filter((n, i) => req.includes(n) && names.indexOf(n) === i);
    if (present.join("|") !== req.filter((r) => present.includes(r)).join("|")) err(f, `разделы не по порядку шаблона: ${req.join(" → ")}`);
    if (d.template === "минимум" && names.includes("Варианты")) err(f, "раздел «Варианты» — только в шаблоне «полный»: поменяйте «Шаблон» в шапке");
  }
  const hints = findHints(d.raw);
  if (hints.length) err(f, `остались подсказки шаблона (${hints.length}): «${hints[0]}»${hints.length > 1 ? " …" : ""}`);

  // история
  const hf = `history/${f}`;
  if (d.historyRaw === null) { err(f, `нет файла истории ${hf} (шаблон — templates/decisions/history.md)`); return; }
  const h = parseHistory(d.historyRaw);
  if (!h.titleId) err(hf, `нет заголовка «# ${d.id} · <вопрос> — история»`);
  else if (h.titleId !== d.id) err(hf, `в заголовке ${h.titleId}, а решение ${d.id}`);
  for (const b of h.bad) err(hf, `запись «## ${b}» — нужно «## ГГГГ-ММ-ДД · автор · принято | изменено | отменено»`);
  const hHints = findHints(d.historyRaw);
  if (hHints.length) err(hf, `остались подсказки шаблона (${hHints.length}): «${hHints[0]}»${hHints.length > 1 ? " …" : ""}`);
  const e = h.entries;
  if (!e.length) { err(hf, "нет записей — нужна хотя бы «## ГГГГ-ММ-ДД · автор · принято»"); return; }
  for (let i = 1; i < e.length; i++) if (e[i].date > e[i - 1].date) err(hf, `записи не по порядку: ${e[i - 1].date} выше ${e[i].date} — новые записи сверху`);
  for (const x of e) {
    if (!x.why) err(hf, `запись ${x.date} · ${x.kind}: нет «**Почему:**»`);
    if (x.kind === "изменено" && !x.was) err(hf, `запись ${x.date} · изменено: нет «**Было (до ГГГГ-ММ-ДД):**» с полным прежним текстом в цитате («> …»)`);
  }
  const accepted = e.filter((x) => x.kind === "принято");
  const bottom = e[e.length - 1];
  if (accepted.length !== 1 || bottom.kind !== "принято") err(hf, "запись «принято» — одна и самая нижняя");
  else if (isDate(d.accepted) && bottom.date !== d.accepted) err(hf, `«принято» ${bottom.date}, а в шапке решения «Принято: ${d.accepted}»`);
  const top = e[0];
  const changed = isDate(d.changed) ? d.changed : null;
  if (!changed && e.length > 1) err(f, `в истории есть правки — в шапке «Изменено:» нужна дата верхней записи (${top.date})`);
  else if (changed && e.length === 1) err(f, `«Изменено: ${changed}», а в истории правок нет — запись «изменено» сверху или «Изменено: —»`);
  else if (changed && top.date !== changed) err(f, `«Изменено: ${changed}», а верхняя запись истории — ${top.date}`);
  if (d.status === "revoked" && top.kind !== "отменено") err(f, "статус «отменён» — сверху в истории нужна запись «отменено»");
  if (d.status === "active" && top.kind === "отменено") err(f, "верхняя запись истории — «отменено», а статус «действует»");
}

const REF = /\b(DEC|ADR|ATD)-(\d{4})\b/g;

function checkLinks(cur, prefix, linked, err, notes) {
  const known = { [prefix]: new Set(cur.decisions.map((d) => d.id)), ...linked };
  const unchecked = new Set();
  for (const d of cur.decisions) {
    if (d.format === "legacy") continue; // старый ADR по стандарту — как есть: его ссылки не проверяются (ссылки на него — да)
    for (const [file, text] of [[d.file, d.raw], [`history/${d.file}`, d.historyRaw]]) {
      if (!text) continue;
      const missing = new Set();
      for (const [ref, kind] of stripComments(norm(text)).matchAll(REF)) {
        if (!known[kind]) unchecked.add(kind);
        else if (!known[kind].has(ref)) missing.add(ref);
      }
      for (const ref of missing) err(file, `ссылка на ${ref} — такого решения нет`);
    }
  }
  for (const k of [...unchecked].sort()) notes.push(`ссылки на ${k}-NNNN не проверены — укажите --link ${k}=<папка>`);
}

/** slug из имени файла: «ADR-0005-use-pg.md», «0005-use-pg.md» → «use-pg». */
const slugOf = (file) => file.replace(/\.md$/, "").replace(/^(?:[A-Z]{3}-|adr-)?\d{3,4}-/i, "");

/**
 * Повтор номера. dupes = "new" (K21) и есть base: ошибка — только у файлов, которых нет в base (новые в PR), — так при
 * повторе краснеет только PR, который его вносит; повтор среди прежних (два PR влили с одним номером) — примечание.
 */
function checkDupes(cur, base, { dupes, baseRef }, err, notes) {
  const byId = new Map();
  for (const d of cur.decisions) (byId.get(d.id) ?? byId.set(d.id, []).get(d.id)).push(d.file);
  const old = new Set(base?.decisions.map((d) => d.file) ?? []);
  for (const [id, files] of byId) {
    if (files.length < 2) continue;
    if (dupes !== "new" || !base) { for (const f of files.slice(1)) err(f, `${id} повторяется (и в ${files[0]}) — второму решению следующий свободный номер`); continue; }
    const fresh = files.filter((f) => !old.has(f));
    if (!fresh.length) { notes.push(`${id} повторяется (${files.join(", ")}) — так уже в ${baseRef}, не в этом PR: второму — следующий свободный номер отдельным PR`); continue; }
    for (const f of fresh) err(f, `${id} уже занят (${files.filter((x) => x !== f).join(", ")}) — возьмите следующий свободный номер и поправьте ссылки`);
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
    // Тот же файл; иначе тот же номер (переименовали slug); номер повторялся в base — тот же slug под новым номером (K21).
    let c = curByFile.get(b.file);
    if (!c && baseIds.get(b.id) === 1) c = curById.get(b.id);
    if (!c && baseIds.get(b.id) > 1) c = cur.decisions.find((d) => !baseFiles.has(d.file) && slugOf(d.file) === slugOf(b.file));
    if (!c) { err(b.file, `${b.id} удалён (есть в ${ref}) — удалять решения нельзя: отменить — статус «отменён» и запись «отменено» в истории`); continue; }
    matched.add(c);
    // HTML-комментарии — не текст решения: их правка записи в истории не требует.
    const changed = same(stripComments(norm(b.raw))) !== same(stripComments(norm(c.raw)));
    if (c.format === "legacy") {
      if (changed) err(c.file, `старый ADR ${c.id} изменён (против ${ref}) — правка идёт по новому правилу: переведите файл в шаблон (шапка, разделы) и заведите историю (templates/decisions/)`);
      continue;
    }
    if (c.format !== "new" || c.historyRaw === null) continue; // ошибка уже записана
    const was = b.format === "new" && b.historyRaw ? parseHistory(b.historyRaw).entries.map((x) => x.block) : [];
    const entries = parseHistory(c.historyRaw).entries;
    const now = entries.map((x) => x.block);
    const tail = now.slice(now.length - was.length);
    if (was.length > now.length || was.some((x, i) => x !== tail[i])) { err(`history/${c.file}`, `прежние записи истории изменены или удалены (против ${ref}) — их не правят; новая запись — сверху`); continue; }
    if (changed && now.length === was.length) { err(c.file, `решение изменилось (против ${ref}), а новой записи в истории нет — добавьте сверху «## ГГГГ-ММ-ДД · автор · изменено» с «Почему» и «Было»`); continue; }
    // «Было» новой записи прямо над прежними — прежний текст решения из базы целиком (пробелы и комментарии не в счёт).
    // Решение нового вида было в базе и изменилось; перевод старого ADR в шаблон («принято» внизу) — не правка.
    const first = entries[now.length - was.length - 1];
    if (changed && b.format === "new" && first?.kind === "изменено" && first.wasText !== null && first.was && bare(first.wasText) !== bare(b.raw)) {
      err(`history/${c.file}`, `запись ${first.date} · изменено: «Было» — не прежний текст решения (против ${ref}): в цитате «> …» — весь файл, как он был до правки, без сокращений (пробелы и переносы строк не в счёт)`);
    }
  }
  // Старый вид (Accepted / Superseded, без шапки и истории) остаётся только у ADR, которые уже были в базе (DEC-0091, правило 7).
  for (const c of cur.decisions) {
    if (c.format === "legacy" && !matched.has(c)) err(c.file, `новый ADR в старом виде (статус «${c.statusRaw}», без шапки и истории) — новые решения только по шаблону: шапка, разделы, история (templates/decisions/, в проекте — 0000-template.md); старый вид остаётся только у ADR, которые уже были в ${ref}`);
  }
}

/**
 * Все проверки папки → { errors: [{ file, text }], notes, count, decisions }; file — путь от папки решений.
 * dupes: "all" — повтор номера — ошибка всегда; "new" — только у новых против base файлов (process guard проекта, K21).
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
    if (info && !info.bad && !files.has(h)) err(`history/${h}`, `история без решения — нет файла ${h}`);
  }
  const linked = {};
  for (const [kind, r] of Object.entries(linkReaders)) if (kind !== prefix) linked[kind] = new Set(loadFolder(r, kind).decisions.map((d) => d.id));
  checkLinks(cur, prefix, linked, err, notes);
  if (base) checkBase(cur, base, baseRef, err);
  return { errors, notes, count: cur.decisions.length, decisions: cur.decisions };
}

// ---------- CLI ----------

// Путь скрипта — как его звать отсюда: utils/decisions.mjs в AI kit, .github/ai-team/decisions.mjs в проекте (та же копия).
const SELF = relative(process.cwd(), SCRIPT) || SCRIPT;
const USAGE = `Решения DEC, ADR, ATD (DEC-0091): индекс и проверки.

  node ${SELF} index <папка> --prefix DEC|ADR|ATD [--check]
  node ${SELF} check <папка> --prefix DEC|ADR|ATD [--base <ref>] [--head <ref>] [--link <ВИД>=<папка>]…

index          собрать <папка>/README.md (действующие, ниже — отменённые); --check — только сверить.
check          шапка, разделы шаблона, история, ID, ссылки; --base — решение, изменённое с точки ответвления
               от ref, — с новой записью в истории («Было» — прежний текст), удалять нельзя, новый ADR — только
               по шаблону, повтор номера — только у новых файлов;
               --head — проверять дерево ref, а не рабочую копию; --link — папка решений другого вида.
Код возврата: 0 — всё в порядке, 1 — ошибки.`;

function parseArgs(argv) {
  const [cmd, dir, ...rest] = argv;
  if (!["index", "check"].includes(cmd)) throw new UsageError(cmd ? `неизвестная команда: ${cmd}` : "нужна команда: index или check");
  if (!dir || dir.startsWith("--")) throw new UsageError("нужна папка решений");
  const o = { cmd, dir, links: {} };
  for (let i = 0; i < rest.length; i++) {
    let [a, v] = rest[i].split(/=(.*)/s);
    if (a === "--check") { o.check = true; continue; }
    if (!["--prefix", "--base", "--head", "--link"].includes(a)) throw new UsageError(`неизвестный аргумент: ${rest[i]}`);
    if (v === undefined) v = rest[++i];
    if (v === undefined || v === "") throw new UsageError(`${a}: нужно значение`);
    if (a === "--link") {
      const m = /^(DEC|ADR|ATD)=(.+)$/i.exec(v);
      if (!m) throw new UsageError(`--link ${v}: нужно <ВИД>=<папка>, например ADR=docs/adr`);
      o.links[m[1].toUpperCase()] = m[2];
    } else o[a.slice(2)] = v;
  }
  o.prefix = o.prefix?.toUpperCase();
  if (!KINDS[o.prefix]) throw new UsageError(`--prefix: нужно DEC, ADR или ATD${o.prefix ? `, а не ${o.prefix}` : ""}`);
  if (cmd === "index" && (o.base || o.head || Object.keys(o.links).length)) throw new UsageError("--base, --head и --link — только у check");
  if (cmd === "check" && o.check) throw new UsageError("--check — только у index");
  if (!o.head && !(existsSync(o.dir) && statSync(o.dir).isDirectory())) throw new UsageError(`нет папки ${o.dir}`);
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
      const { decisions } = loadFolder(fsReader(o.dir), o.prefix);
      const text = buildReadme(existing, o.prefix, decisions);
      if (text === null) { console.error(`${file}: нет меток ${BEGIN} … ${END} (или прежних <!-- ai-team:adr-index:begin/end -->) — поставьте их там, где должен стоять индекс`); return 1; }
      if (o.check) {
        if (existing === text) { console.log(`${file} актуален`); return 0; }
        console.log(`${file} ${existing === null ? "нет" : "устарел"} — соберите: node ${self} index ${o.dir} --prefix ${o.prefix}`);
        return 1;
      }
      if (existing !== text) writeFileSync(file, text);
      const revoked = decisions.filter((d) => d.status === "revoked").length;
      console.log(`${file} ${existing === text ? "уже актуален" : "собран"}: действуют ${decisions.length - revoked}, отменены ${revoked}. Следующий номер — ${nextId(o.prefix, decisions)}.`);
      return 0;
    }
    const reader = o.head ? gitReader(o.dir, o.head) : fsReader(o.dir);
    const baseReader = o.base ? gitReader(o.dir, mergeBase(o.dir, o.base, o.head)) : null;
    const linkReaders = Object.fromEntries(Object.entries(o.links).map(([k, p]) => [k, o.head ? gitReader(p, o.head) : fsReader(p)]));
    // С --base повтор номера — ошибка только у новых против базы файлов (K21): влитый раньше повтор — примечание.
    const r = checkFolder({ reader, prefix: o.prefix, baseReader, baseRef: o.base, linkReaders, dupes: o.base ? "new" : "all" });
    // По файлам: решение, за ним его история; внутри файла — в порядке проверок.
    const key = (f) => `${f.replace(/^history\//, "")}\0${f.startsWith("history/") ? 1 : 0}`;
    const sorted = [...r.errors].sort((a, b) => (key(a.file) < key(b.file) ? -1 : key(a.file) > key(b.file) ? 1 : 0));
    for (const e of sorted) console.log(`${join(o.dir, e.file)}: ${e.text}`);
    for (const n of r.notes) console.log(`примечание: ${n}`);
    const where = `${o.prefix} в ${o.dir}${o.head ? ` (${o.head})` : ""}${o.base ? `, база ${o.base}` : ""}`;
    console.log(r.errors.length ? `Решения ${where}: ${r.count}, ошибок: ${r.errors.length}.` : `Решения ${where}: ${r.count}, ошибок нет.`);
    return r.errors.length ? 1 : 0;
  } catch (e) {
    if (!(e instanceof UsageError)) throw e;
    console.error(e.message);
    return 1;
  }
}

const isMain = (() => { try { return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(SCRIPT); } catch { return false; } })();
if (isMain) process.exitCode = main(process.argv.slice(2));

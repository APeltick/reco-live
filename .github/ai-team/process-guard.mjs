#!/usr/bin/env node
// Process guard AI kit — проверки правил процесса в репозитории проекта (spec/03 §2, spec/04 §5, spec/05 §6, spec/13).
// Лежит в git проекта: работает в CI и в gate без установленного AI kit. Только Node ≥ 22, без зависимостей; решения
// (ADR и ATD) проверяет логикой decisions.mjs рядом — копия utils/decisions.mjs AI kit, тоже в git проекта.
//
//   node .github/ai-team/process-guard.mjs [--base <ref>] [--head <ref>] [--pr-body <файл>] [--all]
//   node .github/ai-team/process-guard.mjs adr-index [--write | --check]       индексы решений: ADR проекта (при правиле adr) и ATD
//   node .github/ai-team/process-guard.mjs adr-bundle [--out <файл>] [--head <ref>]   действующие ADR и ATD одним текстом (review-adr)
//   node .github/ai-team/process-guard.mjs e2e-targets [--base <ref>] [--pr-body <файл>] [--regex]   файлы targeted e2e для CI
//
// --base     с чем сравнивать (по умолчанию origin/$GITHUB_BASE_REF или integration branch из project overlay)
// --head     что проверять (по умолчанию рабочая копия; gate передаёт голову одного PR — тогда и файлы читаются из неё)
// --pr-body  файл с описанием PR (или переменная PR_BODY) — для проверок полей PR template и Tasks:
// --all      проверять правила строк тестов (skip, «сны», serial, локаторы) во всех тестах, а не только в новых строках
// Исключение из правил строк тестов — «reason: <почему>» в той же строке или строкой выше.
// Правила включаются в ai-team-docs/config/project-overlay.md → process-guard.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const USAGE = `process guard AI kit — правила процесса в репозитории проекта (spec/05 §6, spec/13 AI kit).

  node .github/ai-team/process-guard.mjs [--base <ref>] [--head <ref>] [--pr-body <файл>] [--all]
  node .github/ai-team/process-guard.mjs adr-index [--write | --check]
  node .github/ai-team/process-guard.mjs adr-bundle [--out <файл>] [--head <ref>]
  node .github/ai-team/process-guard.mjs e2e-targets [--base <ref>] [--pr-body <файл>] [--head <ref>] [--regex]`;
// Команды и их флаги (T9): незнакомое слово или флаг — подсказка и отказ, ничего не проверяется.
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
  if (!spec) bad(`неизвестная команда «${cmd}»`);
  for (let i = cmd ? 1 : 0; i < a.length; i++) {
    const f = a[i].startsWith("--") ? a[i].slice(2) : null;
    if (f !== null && spec.flags.includes(f)) continue;
    if (f !== null && spec.values.includes(f)) { if (a[i + 1] === undefined) bad(`--${f}: нужно значение`); i++; continue; }
    bad(f !== null ? `неизвестный флаг ${a[i]}${cmd ? ` у ${cmd}` : ""}` : `лишнее слово «${a[i]}»`);
  }
  if (cmd === "adr-index" && a.includes("--write") && a.includes("--check")) bad("adr-index: --write или --check, не оба");
}

const ROOT = (() => { try { return execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim(); } catch { return process.cwd(); } })();
// core.quotePath=false — пути с кириллицей приходят как есть, а не в кавычках с \NNN.
const git = (...a) => { try { return execFileSync("git", ["-C", ROOT, "-c", "core.quotePath=false", ...a], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] }); } catch { return ""; } };
const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
// Что проверяем: рабочая копия (HEAD) или голова одного PR — тогда все файлы читаются из неё (gate, merge group).
const HEAD = opt("head") || "HEAD";
const read = (p) => (HEAD === "HEAD" ? (existsSync(join(ROOT, p)) ? readFileSync(join(ROOT, p), "utf8") : "") : git("show", `${HEAD}:${p}`));
// Рабочая копия — с ещё не добавленными в git файлами (проверка перед коммитом), голова PR — её дерево.
const lsFiles = (...paths) => (HEAD === "HEAD" ? git("ls-files", "--cached", "--others", "--exclude-standard", "--", ...paths) : git("ls-tree", "-r", "--name-only", HEAD, "--", ...paths)).split("\n").filter(Boolean);

// ---------- project overlay (тот же формат, что читает AI kit: «## id» + одна таблица) ----------
function sections(text) {
  const out = {};
  let id = "_"; // таблица до первого «## id» (например, в AREAS.md)
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
const overlay = sections(read("ai-team-docs/config/project-overlay.md"));
const kv = (sec, k = sec?.header?.[0], v = sec?.header?.[1]) => Object.fromEntries((sec?.rows ?? []).map((r) => [r[k], r[v]]));
const project = kv(overlay.project);
const pathsCfg = kv(overlay.paths, "kind", "globs");
// Список шаблонов: через запятую, «;» или пробел; обратные кавычки и маркеры списка снимаются (как в AI kit).
const globsOf = (s) => (s ?? "").split(/[\n,;]+|\s+/).map((x) => x.replace(/`/g, "").trim()).filter((x) => x && !["—", "-", "*", "+"].includes(x));
const RULE_DEFAULTS = {
  "tier-labels": "yes", "tasks-field": "yes", "pr-fields": "yes", adr: "yes", quarantine: "yes", "skip-reason": "yes", "no-wait-timeout": "no", "bare-refs": "no",
  // DEC-0049, DEC-0055, DEC-0065, DEC-0066, DEC-0068.
  "e2e-no-browser": "yes", "no-sleep": "yes", "no-serial": "yes", "forbidden-locators": "yes", "test-layers": "yes", "change-approved": "yes", "adr-human-merge": "yes", "team-docs-map": "yes",
  "people-ids": "yes", // id в roles.md → people — без повторов (без учёта регистра): один id — одна AI team
};
// Свои правила — раздел process-guard project overlay. Проверка PR берёт их из базы (ниже, после --base): PR, который
// выключает правило, сам по нему ещё проверяется — новое действует после влития. Команды без базы — из рабочей копии.
let rules = { ...RULE_DEFAULTS, ...kv(overlay["process-guard"], "rule", "on") };
const on = (r) => /^(yes|on|да)$/i.test(rules[r] ?? "");

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

// ---------- итог ----------
const problems = [], notes = [];
const fail = (rule, text) => problems.push(`[${rule}] ${text}`);

// ---------- решения: ADR проекта и ATD (DEC-0049, DEC-0091) ----------
// Одна модель: файл «как решено сейчас» (<ID>-<slug>.md) и история history/<тот же файл>, номер навсегда, статусы
// «действует» / «отменён». Индекс и проверки — decisions.mjs рядом (копия utils/decisions.mjs AI kit).
// ADR, которые проект вёл по стандарту (NNNN-<slug>.md, Accepted / Superseded), остаются как есть: индекс их понимает.
// decision-paths:begin — копия scripts/lib/decision-paths.mjs AI kit (process guard в git проекта модули AI kit не
// импортирует): папка ADR из project overlay и «файл — решение». Одинаковость сверяет tests/process-guard.test.mjs AI kit.
const ATD_DIR = "ai-team-docs/atd";
const LEGACY_ATD_DIR = "ai-team-docs/adr"; // до DEC-0091 здесь лежали «ADR о работе AI team»
const DEFAULT_ADR_DIR = "docs/adr";
const TEMPLATE_NAMES = ["0000-template.md", "ADR-0000-template.md", "ATD-0000-template.md"];
const AUX_NAMES = ["README.md", "areas.md", "AREAS.md"]; // индекс и прежний список областей ADR (ставил AI kit до DEC-0091)
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
const PROJECT_ADR = projectAdrDir(pathsCfg.adr_dir);
// rule — под каким правилом нарушение: ADR проекта — правило adr (у проекта со своим форматом ADR, keep-own, выключено);
// ATD — свои решения AI team, проверяются всегда.
const SETS = [
  { prefix: "ADR", dir: PROJECT_ADR, title: "ADR проекта", head: "Решения проекта (ADR)", rule: "adr" },
  { prefix: "ATD", dir: ATD_DIR, title: "ATD — решения о работе AI team", head: "Решения о работе AI team (ATD)", rule: "atd" },
];
// Изменение решения (DEC-0065, DEC-0091) — файл в папках решений (и в прежней ai-team-docs/adr): решение, его история,
// ADR своего формата проекта (P10: log4brains, «adr-012-…», .markdown, MADR «0000-use-markdown-…»), удаление и перенос из
// папки. Вспомогательные файлы AI kit — индекс (README.md папки) и шаблон (0000-template.md, ADR-/ATD-0000-template.md) —
// не решение (I1). Правило одно с AI kit (installer ставит по нему строку «ADR вступит в силу после влития» в свой PR;
// gate, merge и сторож — «вливает человек»).
const isAdrDoc = (f) => isDecisionFile(f, [PROJECT_ADR, ATD_DIR, LEGACY_ATD_DIR]);

// Логика решений — в decisions.mjs рядом; нет его (process guard обновили без него) — правило adr красное, остальное идёт.
let D = null;
try { D = await import("./decisions.mjs"); } catch { /* скажет правило adr */ }
const NO_DECISIONS = ".github/ai-team/decisions.mjs нет рядом с process guard — решения не проверить: ai-team update (или скопируйте utils/decisions.mjs AI kit)";
// Читать папку: рабочая копия или дерево ref (голова PR, merge-base).
const readerOf = (dir, ref = HEAD) => (ref === "HEAD" ? D.fsReader(join(ROOT, dir)) : D.gitReader(join(ROOT, dir), ref));
const INDEX_CMD = "ai-team adr-index (или node .github/ai-team/process-guard.mjs adr-index --write)";

/** README набора, если его нет: заголовок, как устроено, метки индекса. */
const skeleton = (set) => [
  `# ${set.head}`, "",
  `Индекс собирает скрипт — ${INDEX_CMD}; руками не править, конфликт в git не сводить, а пересобрать. Решение — файл \`${set.prefix}-NNNN-<slug>.md\` («как решено сейчас»), его история — \`history/<тот же файл>\`, новые записи сверху. Следующий номер — \`ai-team adr-next${set.prefix === "ATD" ? " --atd" : ""}\`.`, "",
  "<!-- decisions-index:begin -->", "<!-- decisions-index:end -->", "",
].join("\n");

/**
 * Решения: шаблон, история, номера (повтор — только у новых файлов PR, K21), удаление, ссылки, индекс.
 * sets — какие наборы проверять (ADR проекта — если правило adr включено; ATD — всегда).
 */
function checkDecisions(base, sets) {
  if (!sets.length) return;
  if (!D) { for (const set of sets) if (set.rule === "adr" || lsFiles(set.dir).length) fail(set.rule, NO_DECISIONS); return; }
  let mb = null;
  try {
    // Ссылки разрешаются по обоим наборам, даже если один из них не проверяется.
    const readers = Object.fromEntries(SETS.map((st) => [st.prefix, readerOf(st.dir)]));
    if (base) mb = D.mergeBase(ROOT, base, HEAD);
    for (const set of sets) {
      const links = Object.fromEntries(SETS.filter((x) => x !== set).map((x) => [x.prefix, readers[x.prefix]]));
      const r = D.checkFolder({ reader: readers[set.prefix], prefix: set.prefix, baseReader: mb ? readerOf(set.dir, mb) : null, baseRef: base, linkReaders: links, dupes: "new" });
      for (const e of r.errors) fail(set.rule, `${set.dir}/${e.file}: ${e.text}`);
      // DEC — решения AI kit: в проекте их нет, ссылки на них не проверить.
      for (const n of r.notes) if (!/^ссылки на DEC-NNNN/.test(n)) notes.push(`⚠️ ${set.dir}: ${n}`);
      if (!r.count) continue; // решений нет — индекс не проверяется
      const rel = `${set.dir}/README.md`;
      const existing = read(rel) || null;
      const text = existing === null ? null : D.buildReadme(existing, set.prefix, r.decisions);
      if (existing === null) fail(set.rule, `${rel}: нет индекса — соберите: ${INDEX_CMD}`);
      else if (text === null) fail(set.rule, `${rel}: нет меток индекса (<!-- decisions-index:begin --> … <!-- decisions-index:end -->)`);
      else if (text !== existing) fail(set.rule, `индекс ${rel} устарел — пересоберите: ${INDEX_CMD}; конфликт в индексе при rebase не сводите руками — пересоберите`);
    }
  } catch (e) { fail(sets[0].rule, `решения не прочитать: ${String(e.message).split("\n")[0]}`); }
}

/**
 * Новый файл в прежней папке ai-team-docs/adr/ (I22): ATD с DEC-0091 — в ai-team-docs/atd/ (обновление AI kit перенесло
 * папку). Так пишет тот, у кого AI kit ещё прежний: без этой проверки его PR красный только картой ai-team-docs — непонятно почему.
 */
function checkLegacyAtdDir(base) {
  if (!base) return;
  const added = git("diff", "--no-renames", "--name-only", "--diff-filter=A", `${base}...${HEAD}`, "--", `${LEGACY_ATD_DIR}/`).split("\n").filter(Boolean);
  for (const f of added) fail("atd", `${f}: решения о работе AI team теперь в ${ATD_DIR}/ (ATD-NNNN-<slug>.md, DEC-0091) — обнови AI kit (installer/INSTALL.md, режим «обновление»), номер — ai-team adr-next --atd, и положи решение туда`);
}

/** Пересобрать индексы (adr-index --write): конфликт git внутри блока индекса уходит вместе со старым текстом блока. */
function writeIndexes(sets) {
  let bad = 0;
  for (const set of sets) {
    const f = join(ROOT, set.dir, "README.md");
    const existing = existsSync(f) ? readFileSync(f, "utf8") : null;
    const { decisions } = D.loadFolder(D.fsReader(join(ROOT, set.dir)), set.prefix);
    const text = D.buildReadme(existing ?? skeleton(set), set.prefix, decisions);
    if (text === null) { console.error(`${set.dir}/README.md: нет меток индекса <!-- decisions-index:begin --> … <!-- decisions-index:end --> — поставьте их там, где должен стоять индекс`); bad++; continue; }
    if (/^(<{7}|={7}|>{7})( |$)/m.test(text)) { console.error(`${set.dir}/README.md: конфликт git вне блока индекса — сведите этот текст руками, индекс пересоберётся сам`); bad++; continue; }
    if (text !== existing) { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, text); }
    const revoked = decisions.filter((d) => d.status === "revoked").length;
    console.log(`${set.dir}/README.md: индекс ${text === existing ? "уже свежий" : "обновлён"} (действуют ${decisions.length - revoked}, отменены ${revoked}); следующий номер по этой копии — ${D.nextId(set.prefix, decisions)}, с открытыми PR коллег — ai-team adr-next${set.prefix === "ATD" ? " --atd" : ""}`);
  }
  return bad;
}

/** Все действующие решения обоих наборов одним текстом — для свежего subagent review-adr (DEC-0054): все против всех. */
function adrBundle() {
  const parts = ["# Действующие решения — ADR проекта и ATD", "", "Проверь все против всех: противоречия и дубли. Вид, номер и путь — в заголовке каждого.", ""];
  for (const set of SETS) {
    const active = D.loadFolder(readerOf(set.dir), set.prefix).decisions.filter((d) => d.status !== "revoked" && (d.format !== "none" || d.titleId));
    parts.push(`## Набор: ${set.title} (${set.dir}) — ${active.length}`, "");
    for (const d of active) parts.push(`### ${set.dir}/${d.file}`, "", d.raw.trim(), "");
  }
  return `${parts.join("\n").trimEnd()}\n`;
}

// ---------- tasks.md ----------
const TASK_LINE = /^\s*-\s*\[( |x|X)\]\s+(\d+(?:\.\d+)*)\s+(.*)$/;
const isActiveTasks = (f) => /\/tasks\.md$/.test(f) && !f.includes("/archive/");

/** Метки AI model tier — в tasks.md, которые менял этот PR (без базы — во всех активных change). */
function checkTierLabels(base) {
  const files = base ? git("diff", "--name-only", "--diff-filter=AM", `${base}...${HEAD}`, "--", "openspec/changes").split("\n").filter(isActiveTasks)
    : lsFiles("openspec/changes").filter(isActiveTasks);
  for (const f of files) {
    read(f).split("\n").forEach((line, i) => {
      const m = TASK_LINE.exec(line);
      if (!m) return;
      const n = (m[3].match(/\[(strong|standard|light)\]/g) ?? []).length;
      if (n !== 1) fail("tier-labels", `${f}:${i + 1}: task ${m[2]} — ${n ? "больше одной метки" : "нет метки"} AI model tier ([strong] / [standard] / [light])`);
    });
  }
}

const tasksState = (text) => Object.fromEntries(text.split("\n").map((l) => TASK_LINE.exec(l)).filter(Boolean).map((m) => [m[2], m[1] !== " "]));

function checkTasksField(base, head, body) {
  const field = /^Tasks:[ \t]*(.*)$/m.exec(body)?.[1]?.trim() ?? "";
  const declared = new Set(field === "—" || field === "-" || !field ? [] : field.split(/[,\s]+/).map((s) => s.split(":").pop()).filter((s) => /^\d+(\.\d+)*$/.test(s)));
  const checked = new Set(), unchecked = [];
  // «До» — с merge-base, а не с головы базы: чужие галочки, влитые после ответвления, — не наши.
  const mb = git("merge-base", base, head).trim() || base;
  for (const f of git("diff", "--name-only", "--diff-filter=AM", `${base}...${head}`, "--", "openspec/changes").split("\n").filter(isActiveTasks)) {
    const before = tasksState(git("show", `${mb}:${f}`)), after = tasksState(read(f));
    for (const [t, done] of Object.entries(after)) if (done && !before[t]) checked.add(t);
    for (const [t, done] of Object.entries(before)) if (done && after[t] === false) unchecked.push(`${f}: ${t}`);
  }
  for (const u of unchecked) fail("tasks-field", `снята чужая галочка [x] — ${u}`);
  const miss = [...declared].filter((t) => !checked.has(t)), extra = [...checked].filter((t) => !declared.has(t));
  if (miss.length) fail("tasks-field", `в Tasks: заявлено, а [x] в tasks.md не поставлено: ${miss.join(", ")}`);
  if (extra.length) fail("tasks-field", `[x] поставлено, а в Tasks: не заявлено: ${extra.join(", ")}`);
}

const PR_FIELDS = ["Tasks", "E2E", "Test layers", "Screenshots", "Proof", "Depends on", "Issue", "Models"];
function checkPrFields(body) {
  for (const f of PR_FIELDS) {
    const m = new RegExp(`^${f}:[ \\t]*(.*)$`, "m").exec(body);
    if (!m) fail("pr-fields", `в описании PR нет поля «${f}:» (PR template)`);
    else if (!m[1].trim() || /<[^>]+>/.test(m[1])) fail("pr-fields", `поле «${f}:» не заполнено (— если нечего)`);
  }
  for (const h of ["Конфликты", "Решения сверх requirement"]) if (!new RegExp(`^##\\s+${h}`, "m").test(body)) fail("pr-fields", `в описании PR нет раздела «## ${h}»`);
}

// ---------- тесты: quarantine, skip, waitForTimeout ----------
const TEST_PLACE = /(^|\/)(tests?|__tests__|e2e|specs?)\/|\.(test|spec|e2e)\.[cm]?[jt]sx?$|_test\.(go|py|rb|exs?)$|(^|\/)test_[^/]+\.py$|_spec\.rb$/;
const CODE = /\.([cm]?[jt]sx?|py|go|rb|rs|java|kt|cs|swift|exs?)$/;
const isTestCode = (f) => TEST_PLACE.test(f) && CODE.test(f); // README в tests/ — не тест
const SKIP = /\b(?:it|test|describe|context)\.(?:skip|fixme)\b|\b(?:xit|xdescribe|xtest)\s*\(|pytest\.mark\.skip|\bt\.Skip(?:Now|f)?\s*\(/;
const REASON = /\b(?:reason|причина)\s*:/i;

function checkQuarantine() {
  const security = globsOf(pathsCfg.security_tests);
  const today = new Date().toISOString().slice(0, 10);
  let count = 0;
  const withLabel = new Set(git("grep", "-l", "--fixed-strings", ...(HEAD === "HEAD" ? ["--untracked"] : []), "@quarantine", ...(HEAD === "HEAD" ? [] : [HEAD]), "--").split("\n").filter(Boolean).map((l) => (HEAD === "HEAD" ? l : l.slice(HEAD.length + 1))));
  for (const f of [...withLabel].filter(isTestCode)) {
    const text = read(f);
    text.split("\n").forEach((line, i) => {
      if (!line.includes("@quarantine")) return;
      count++;
      const m = /@quarantine\s+#(\d+)\s+до\s+(\d{2})\.(\d{2})\.(\d{4})/.exec(line);
      if (!m) { fail("quarantine", `${f}:${i + 1}: метка — «@quarantine #<issue> до ДД.ММ.ГГГГ»`); return; }
      if (`${m[4]}-${m[3]}-${m[2]}` < today) fail("quarantine", `${f}:${i + 1}: срок quarantine прошёл (${m[2]}.${m[3]}.${m[4]}) — тест снова блокирует: почините или продлите с разрешения человека`);
      if (matches(security, f)) fail("quarantine", `${f}:${i + 1}: тест безопасности и изоляции данных в quarantine нельзя`);
    });
  }
  if (count > 3) fail("quarantine", `в quarantine ${count} тестов — больше 3 нельзя`);
}

/**
 * Строка без пробелов, с одинаковыми кавычками и без «;» и «,» — по ней старая строка узнаётся после форматтера
 * (отступ, обёртка в test.step, кавычки, точки с запятой, разнесённая на строки или склеенная в одну — G10, N15).
 */
const compact = (t) => t.replace(/\s+/g, "").replace(/["'`]/g, "'").replace(/[;,]/g, "");

/**
 * Новые строки по сравнению с base (или все строки тестов при --all): [{ file, line, text, prev }].
 * Новая — только если её не было: дифф без разницы в пробелах, а добавленная строка, текст которой есть среди удалённых
 * строк тестов всего диффа (переформатировали, разнесли на строки, перенесли внутри файла или в другой файл), — не новая
 * (G10, N15). Удалённые строки склеиваются подряд, каждое совпадение «съедает» свой кусок — одна удалённая строка не
 * оправдывает две новые; длинные строки сверяются первыми. prev — предыдущая строка файла в проверяемой голове,
 * даже если она старая: «reason:» строкой выше действует и над старой строкой (G13).
 */
function addedTestLines(base, head, all) {
  const out = [];
  if (all || !base) {
    for (const f of lsFiles().filter(isTestCode)) read(f).split("\n").forEach((text, i, arr) => out.push({ file: f, line: i + 1, text, prev: i ? arr[i - 1] : "" }));
    return out;
  }
  const diff = git("diff", "--unified=0", "--no-color", "--ignore-space-change", `${base}...${head}`).split("\n");
  // Разбор: «--- »/«+++ » — заголовок файла только до первого «@@» (удалённая строка «-- x» тоже начинается с «---»).
  const sections = [];
  let cur = null, header = false;
  const path = (l) => (l.endsWith("/dev/null") ? null : l.slice(6).replace(/\t$/, "")); // путь с пробелом git завершает табуляцией
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
  // Удалённые строки тестов всего диффа (и удалённых файлов) — подряд, без разделителя: склеенная форматтером строка тоже найдётся.
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
  for (const { file, line, text, prev } of lines) if (SKIP.test(text) && !REASON.test(text) && !text.includes("@quarantine") && !REASON.test(prev)) fail("skip-reason", `${file}:${line}: skip / fixme без причины — допишите «reason: …» или issue`);
}
const excused = (text, prev) => REASON.test(text) || REASON.test(prev ?? "");
// «Сны» (DEC-0068): ждать событие или ответ, а не секунды.
const SLEEP = /\bwaitForTimeout\s*\(|\b(?:time\.)?sleep\s*\(|\bThread\.sleep\s*\(|new\s+Promise\s*\(\s*\(?\s*\w*\s*\)?\s*=>\s*setTimeout\s*\(/;
function checkWaits(lines, rule = "no-sleep") {
  for (const { file, line, text, prev } of lines) if (SLEEP.test(text) && !excused(text, prev)) fail(rule, `${file}:${line}: «сон» (waitForTimeout / sleep) — ждите событие или ответ, а не секунды (spec/05); исключение — «reason: …»`);
}
// serial и зависимость от порядка: тесты должны идти в любом порядке и параллельно (DEC-0068, DEC-0069).
const SERIAL = /\.describe\.serial\b|\bmode\s*:\s*['"`]serial['"`]|\btest\.describe\.configure\s*\(\s*\{[^}]*serial|@pytest\.mark\.order\b/;
function checkSerial(lines) {
  for (const { file, line, text, prev } of lines) if (SERIAL.test(text) && !excused(text, prev)) fail("no-serial", `${file}:${line}: serial / порядок тестов — тест должен проходить один и параллельно с другими (своя организация данных на воркер, spec/05); исключение — «reason: …»`);
}
/** Запрещённые локаторы — шаблоны из project overlay → forbidden-locators (классы UI-библиотеки, XPath). */
function checkLocators(lines) {
  const rows = (overlay["forbidden-locators"]?.rows ?? []).filter((r) => r.pattern && !/^<.*>$/.test(r.pattern));
  const res = rows.flatMap((r) => { try { return [{ re: new RegExp(r.pattern), why: r.why || "запрещённый локатор" }]; } catch { notes.push(`⚠️ forbidden-locators: шаблон «${r.pattern}» не регулярное выражение — пропущен`); return []; } });
  if (!res.length) return;
  for (const { file, line, text, prev } of lines) {
    const hit = res.find((x) => x.re.test(text));
    if (hit && !excused(text, prev)) fail("forbidden-locators", `${file}:${line}: ${hit.why} (шаблон ${hit.re.source}) — роль, подпись или test id; исключение — «reason: …»`);
  }
}

// ---------- слои тестов (DEC-0066): e2e — то, что видит и делает человек; без браузера — integration ----------
const E2E_DIR = (globsOf(pathsCfg.e2e_dir)[0] || "").replace(/\/+$/, "");
const INT_DIR = (globsOf(pathsCfg.integration_dir)[0] || "").replace(/\/+$/, "");
const inDir = (dir, f) => !!dir && (f === dir || f.startsWith(`${dir}/`));
const layerOf = (f) => (inDir(E2E_DIR, f) ? "e2e" : inDir(INT_DIR, f) ? "integration" : "unit");
// Начало теста Playwright и его фикстуры: test('…', async ({ page }) => …) / test("…", { tag }, async ({ request }) => …).
const TEST_START = /\b(?:test|it)(?:\.only)?\s*\(\s*(['"`]).*?\1\s*,\s*(?:\{[^)]*?\}\s*,\s*)?async\s*\(\s*(\{[^}]*\})?/;
const BROWSER = /\b(page|browser|context)\b/;

/**
 * Новый тест в e2e_dir без браузера — «не e2e, перенеси в integration». Признак браузера — page / browser / context
 * в фикстурах теста Playwright; overlay paths.e2e_browser_marker (регулярное выражение) — сверх них (G14): свои фикстуры
 * Playwright (adminPage, app) и признак для других инструментов (новый файл без тестов в стиле Playwright — по тексту файла).
 */
function checkE2eBrowser(lines, newFiles) {
  if (!E2E_DIR) return;
  // Несколько признаков — через запятую (в ячейке таблицы «|» нельзя): каждый — регулярное выражение, годится любой.
  const marker = globsOf(pathsCfg.e2e_browser_marker).join(", ");
  let re = null;
  if (marker) { try { re = new RegExp(globsOf(pathsCfg.e2e_browser_marker).map((x) => `(?:${x})`).join("|")); } catch { notes.push(`⚠️ e2e_browser_marker «${marker}» не регулярное выражение — правило e2e-no-browser пропущено`); return; } }
  const browser = (fixtures) => BROWSER.test(fixtures) || (re ? re.test(fixtures) : false);
  for (const { file, line, text, prev } of lines) {
    if (!inDir(E2E_DIR, file)) continue;
    const m = TEST_START.exec(text);
    if (!m || excused(text, prev)) continue;
    if (!browser(m[2] ?? "")) fail("e2e-no-browser", `${file}:${line}: e2e-тест без page / browser / context${marker ? ` и без признака ${marker}` : ""} — это не e2e: проверка сервера и базы — в integration (spec/05, слои тестов); исключение — «reason: …»`);
  }
  if (!re) return;
  for (const f of newFiles.filter((x) => inDir(E2E_DIR, x) && isTestCode(x))) {
    const text = read(f);
    if (text.split("\n").some((l) => TEST_START.test(l))) continue; // тесты в стиле Playwright проверены по фикстурам выше
    if (!re.test(text) && !REASON.test(text.split("\n").slice(0, 3).join("\n"))) fail("e2e-no-browser", `${f}: в e2e нет признака браузера (${marker}) — это не e2e: перенеси в integration (spec/05, слои тестов)`);
  }
}

/** Значение поля PR, которое может продолжаться на следующих строках (до следующего поля или раздела). */
function multiField(body, name) {
  const lines = (body ?? "").split("\n");
  const i = lines.findIndex((l) => new RegExp(`^${name}:`).test(l));
  if (i < 0) return null;
  const out = [lines[i].replace(new RegExp(`^${name}:[ \\t]*`), "")];
  for (const l of lines.slice(i + 1)) { if (/^(##\s|[A-ZА-Я][\wА-Яа-я ]{1,30}:\s)/.test(l) || l.trim() === "") break; out.push(l); }
  return out.join("\n").trim();
}

/** Поле PR «Test layers:» (DEC-0068): каждый новый файл теста — со слоем; новый e2e — «не ниже: …», новый файл e2e — ещё «не шагом: …». */
function checkTestLayers(body, newFiles, lines) {
  const field = multiField(body, "Test layers");
  const newTests = newFiles.filter(isTestCode);
  // Новые e2e-тесты в уже существующих файлах e2e — тоже с объяснением «почему не ниже».
  const e2eTouched = [...new Set(lines.filter((l) => inDir(E2E_DIR, l.file) && !newTests.includes(l.file) && TEST_START.test(l.text)).map((l) => l.file))];
  const need = [...newTests, ...e2eTouched];
  if (!need.length) return;
  if (field === null || !field || field === "—" || /<[^>]+>/.test(field)) { fail("test-layers", `поле «Test layers:» не заполнено, а тесты новые: ${need.join(", ")} — у каждого слой (unit / integration / e2e), у нового e2e — «не ниже: …» (spec/05)`); return; }
  const at = need.map((f) => ({ f, i: field.indexOf(f) })).filter((x) => x.i >= 0).sort((a, b) => a.i - b.i);
  for (const f of need.filter((x) => field.indexOf(x) < 0)) fail("test-layers", `Test layers: нет файла ${f} — путь и слой`);
  for (const [k, { f, i }] of at.entries()) {
    const seg = field.slice(i + f.length, k + 1 < at.length ? at[k + 1].i : undefined);
    const layer = /\b(unit|integration|e2e|smoke)\b/i.exec(seg)?.[1]?.toLowerCase();
    if (!layer) { fail("test-layers", `Test layers: у ${f} нет слоя (unit / integration / e2e)`); continue; }
    const where = layerOf(f);
    const norm = layer === "smoke" ? "e2e" : layer;
    const mismatch = where === "e2e" ? norm !== "e2e" : where === "integration" ? norm !== "integration" : norm === "e2e" || (norm === "integration" && !!INT_DIR);
    if (mismatch) fail("test-layers", `Test layers: ${f} — заявлен ${layer}, а лежит как ${where} (${where === "e2e" ? E2E_DIR : where === "integration" ? INT_DIR : "вне e2e_dir и integration_dir"})`);
    if (where === "e2e") {
      if (!/не\s+ниже\s*:/i.test(seg)) fail("test-layers", `Test layers: ${f} — e2e без «не ниже: <почему не integration или unit>»`);
      if (newTests.includes(f) && !/не\s+шагом\s*:/i.test(seg)) fail("test-layers", `Test layers: ${f} — новый файл e2e без «не шагом: <почему не шаг в существующем сценарии>»`);
    }
  }
}

// ---------- spec PR: «Change утвердил» (DEC-0055, DEC-0084, K24) ----------
// «Change утвердил: <person>, <ГГГГ-ММ-ДД ЧЧ:ММ>, OI-N» и следующей строкой цитата слов человека «> …». Здесь — только
// формат: журнал ввода у каждого свой, цитату с записью сверяют gate и ai-team check у AI team того, кто утверждал.
// Взявший PR сам поменял change — новая такая строка от своего человека (строк может быть несколько).
const CHANGE_DEF = /^openspec\/changes\/(?!archive\/)[^/]+\/(proposal\.md|design\.md|specs\/.+)$/;
const APPROVAL_LINE = /^Change утвердил:[ \t]*(.*)$/;
const APPROVAL_VALUE = /^([a-z0-9][a-z0-9-]*)\s*,\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s*,\s*OI-\d+\s*$/;
const APPROVAL_FORMAT = "«Change утвердил: <person>, <ГГГГ-ММ-ДД ЧЧ:ММ>, OI-N» и следующей строкой цитата слов человека «> …»";
const realTime = (d, t) => { const x = new Date(`${d}T${t}:00Z`); return !Number.isNaN(x.getTime()) && x.toISOString().startsWith(`${d}T${t}`); };

/** Строки «Change утвердил: …» и цитата под каждой (строки «> …» подряд). Прочерк и подсказка шаблона — не строка. */
function approvals(body) {
  const lines = body.replace(/\r\n?/g, "\n").split("\n");
  return lines.flatMap((l, i) => {
    const m = APPROVAL_LINE.exec(l);
    const value = m?.[1].trim() ?? "";
    if (!m || !value || /^[—–-]$/.test(value) || /<[^>]+>/.test(value)) return [];
    const quote = [];
    for (const q of lines.slice(i + 1)) { const x = /^[ \t]*>[ \t]?(.*)$/.exec(q); if (!x) break; quote.push(x[1]); }
    return [{ value, quote: quote.join("\n").trim() }];
  });
}

/** spec PR меняет определение change (proposal, design, specs) или добавляет task — нужна строка «Change утвердил» с цитатой. */
function checkChangeApproved(base, head, body) {
  const changed = git("diff", "--name-only", `${base}...${head}`).split("\n").filter(Boolean);
  let trigger = changed.filter((f) => CHANGE_DEF.test(f));
  if (!trigger.length) {
    const mb = git("merge-base", base, head).trim() || base;
    for (const f of changed.filter(isActiveTasks)) {
      const before = new Set(Object.keys(tasksState(git("show", `${mb}:${f}`))));
      if (Object.keys(tasksState(read(f))).some((t) => !before.has(t))) trigger.push(f);
    }
  }
  if (!trigger.length) return;
  const list = approvals(body);
  if (!list.length) { fail("change-approved", `spec PR меняет change (${trigger.slice(0, 3).join(", ")}) — нужна строка ${APPROVAL_FORMAT}: человек утверждает change целиком (spec/03)`); return; }
  for (const a of list) {
    const m = APPROVAL_VALUE.exec(a.value);
    if (!m || !realTime(m[2], m[3])) fail("change-approved", `«Change утвердил: ${a.value}» — формат «<person>, <ГГГГ-ММ-ДД ЧЧ:ММ>, OI-N» (номер записи журнала ввода человека, ai-team said)`);
    else if (!a.quote || /^<[^>]*>$/.test(a.quote)) fail("change-approved", `«Change утвердил: ${a.value}» — следующей строкой нужна цитата слов человека «> …» — текст его записи в журнале ввода`);
  }
}

// ---------- PR с ADR (DEC-0065): принимает человек; предложение действует только после влития ----------
const ADR_PENDING_LINE = /ADR вступит в силу после влития/i;
function checkAdrPr(base, head, body) {
  // --no-renames: у ADR, вынесенного из папки, виден и старый путь.
  const docs = git("diff", "--no-renames", "--name-only", `${base}...${head}`).split("\n").filter(isAdrDoc);
  if (docs.length && !ADR_PENDING_LINE.test(body)) fail("adr-human-merge", `PR меняет ADR (${docs.join(", ")}) — в описании строка «ADR вступит в силу после влития» и метка adr; влить — только с одобрением человека на хостинге или по его слову «вливай #N» (spec/13 §2)`);
}

// ---------- карта ai-team-docs (DEC-0049): файл без строки в карте README — красный PR ----------
function checkTeamDocsMap() {
  const files = lsFiles("ai-team-docs");
  if (!files.length) return;
  const readme = read("ai-team-docs/README.md");
  if (!readme) { fail("team-docs-map", "ai-team-docs/README.md (карта папки) нет — папку без карты не понять (DEC-0049)"); return; }
  const listed = [...readme.matchAll(/^\|\s*`([^`|]+)`\s*\|/gm)].map((m) => m[1].trim().replace(/^ai-team-docs\//, ""));
  for (const f of files) {
    const rel = f.slice("ai-team-docs/".length);
    if (!listed.some((x) => x === rel || (x.endsWith("/") && rel.startsWith(x)))) fail("team-docs-map", `${f}: файла нет в карте ai-team-docs/README.md — допишите строку (что это, кто правит) или положите файл в другое место`);
  }
}

// ---------- люди команды: id без повторов (spec/01 §6) ----------
// Повтор появляется при ручном rebase PR присоединения (конфликт в people): две AI team с одним id делят ветки и метки.
function checkPeopleIds() {
  const rows = sections(read("ai-team-docs/config/roles.md")).people?.rows ?? [];
  const seen = new Map();
  for (const r of rows) {
    const id = String(r.id ?? "").trim();
    if (!id || id === "—" || /^<.*>$/.test(id)) continue;
    const k = id.toLowerCase();
    if (seen.has(k)) fail("people-ids", `ai-team-docs/config/roles.md → people: id «${id}» повторяется (уже есть «${seen.get(k)}», регистр не в счёт) — один id — одна AI team: у второго — свой id; PR присоединения — повторить join на свежей базе, а не сводить конфликт руками`);
    else seen.set(k, id);
  }
}

function checkBareRefs() {
  const files = lsFiles(PROJECT_ADR, "ai-team-docs").filter((f) => f.endsWith(".md") && !/(^|\/)history\//.test(f)); // история — прежний текст как был
  for (const f of files) read(f).split("\n").forEach((line, i) => {
    if (/\b(?:ADR|ATD|DEC)[\s_]?\d{1,4}\b(?!-)|\b(?:ADR|ATD|DEC)-\d{1,3}\b|\b(?:adr|atd)-\d{4}\b/.test(line.replace(/\b(?:ADR|ATD|DEC)-\d{4}/g, ""))) fail("bare-refs", `${f}:${i + 1}: ссылка на решение — только «ADR-NNNN», «ATD-NNNN», «DEC-NNNN»`);
    if (/\bOQ-\d+\b/.test(line)) fail("bare-refs", `${f}:${i + 1}: OQ в документах команды не упоминаются (они личные)`);
  });
}

// ---------- e2e-targets: что гонять в targeted e2e lane CI (spec/05 §3) ----------
function e2eTargets(base, body) {
  const rel = (g) => g.replace(/^\.\//, ""); // «./tests/…» — то же, что «tests/…»
  const listed = globsOf(/^E2E:[ \t]*(.*)$/m.exec(body ?? "")?.[1] ?? "").map(rel);
  const changed = base ? git("diff", "--name-only", `${base}...${HEAD}`).split("\n").filter(Boolean) : [];
  const map = (overlay["e2e-map"]?.rows ?? []).filter((r) => r.path && !/^</.test(r.path));
  const mapped = map.filter((r) => changed.some((f) => matches([rel(r.path)], f))).flatMap((r) => globsOf(r.e2e).map(rel));
  const all = lsFiles();
  const out = new Set();
  for (const g of [...listed, ...mapped]) for (const f of all) if (f === g || matches([g], f)) out.add(f);
  return [...out];
}

// ---------- запуск ----------
if (args[0] === "e2e-targets") {
  const b = opt("base") || (process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : "");
  // По одному на строку: в путях бывают пробелы (CI читает через mapfile). Целей нет — не печатать ничего:
  // пустая строка стала бы целью «» — а пустой фильтр Playwright совпадает со всеми тестами.
  // --regex: пути как фильтр Playwright (аргументы его CLI — регулярки, а в путях бывают ( ) [ ]).
  const targets = e2eTargets(b, opt("pr-body") ? readFileSync(opt("pr-body"), "utf8") : process.env.PR_BODY ?? "")
    .map((f) => (args.includes("--regex") ? f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : f));
  if (targets.length) process.stdout.write(`${targets.join("\n")}\n`);
  process.exit(0);
}
if (args[0] === "adr-index") {
  if (!D) { console.error(NO_DECISIONS); process.exit(1); }
  // Набор ADR — только если правило adr включено: ADR своего формата (keep-own, adr: no) — не наше дело, их README
  // не пишется и не сверяется (I18). Набор ATD — только если папка ai-team-docs есть (проект без файлов AI kit).
  const sets = SETS.filter((st) => (st.prefix === "ADR" ? on("adr") : lsFiles("ai-team-docs").length));
  if (!on("adr")) console.log(`ADR проекта — свои (правило adr выключено в project overlay): индекс ${PROJECT_ADR}/README.md не собирается и не сверяется`);
  if (args.includes("--check")) {
    let stale = 0;
    for (const set of sets) {
      const rel = `${set.dir}/README.md`;
      const existing = read(rel) || null;
      const text = existing === null ? null : D.buildReadme(existing, set.prefix, D.loadFolder(readerOf(set.dir), set.prefix).decisions);
      if (text === null || text !== existing) { stale++; console.log(`индекс ${rel} ${existing === null ? "нет" : text === null ? "без меток" : "устарел"} — ${INDEX_CMD}`); }
    }
    if (!stale) console.log("индексы решений свежие");
    process.exit(stale ? 1 : 0);
  }
  if (args.includes("--write")) process.exit(writeIndexes(sets) ? 1 : 0);
  for (const set of sets) console.log(`## ${set.dir}/README.md\n\n${D.renderIndex(D.loadFolder(readerOf(set.dir), set.prefix).decisions)}\n`);
  process.exit(0);
}
if (args[0] === "adr-bundle") {
  if (!D) { console.error(NO_DECISIONS); process.exit(1); }
  const text = adrBundle();
  if (opt("out")) { writeFileSync(opt("out"), text); console.log(`действующие ADR и ATD — ${opt("out")}`); } else process.stdout.write(text);
  process.exit(0);
}

const baseRef = opt("base") || (process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : project.integration_branch ? `origin/${project.integration_branch}` : "");
const base = baseRef && git("rev-parse", "--verify", "-q", `${baseRef}^{commit}`).trim() ? baseRef : "";
if (!base) notes.push(`⚠️ база ${baseRef || "(не задана)"} не найдена (неглубокий клон? незаполненный project overlay?) — проверки по диффу шли по всему дереву, Tasks: не проверялось`);
// Правила process guard — из базы, а не из головы PR. В базе project overlay ещё нет (setup PR AI kit) — из PR.
if (base) {
  const baseText = git("show", `${base}:ai-team-docs/config/project-overlay.md`);
  if (baseText) {
    const baseRules = { ...RULE_DEFAULTS, ...kv(sections(baseText)["process-guard"], "rule", "on") };
    const changed = Object.keys({ ...rules, ...baseRules }).filter((r) => /^(yes|on|да)$/i.test(rules[r] ?? "") !== /^(yes|on|да)$/i.test(baseRules[r] ?? ""));
    if (changed.length) notes.push(`ℹ️ PR меняет правила process guard (${changed.join(", ")}) — проверка идёт по правилам базы ${base}; новые подействуют после влития`);
    rules = baseRules;
  }
}
const head = HEAD;
const bodyFile = opt("pr-body");
// Комментарии шаблона PR (<!-- … -->) — не текст PR: в них есть подсказки вроде «ADR вступит в силу после влития».
const rawBody = bodyFile ? (existsSync(bodyFile) ? readFileSync(bodyFile, "utf8") : "") : process.env.PR_BODY ?? null;
const body = rawBody === null ? null : rawBody.replace(/<!--[\s\S]*?-->/g, "");

if (on("tier-labels")) checkTierLabels(base);
checkDecisions(base, SETS.filter((st) => st.rule !== "adr" || on("adr"))); // ATD — всегда, ADR проекта — по правилу adr
checkLegacyAtdDir(base);
if (on("quarantine")) checkQuarantine();
const LINE_RULES = ["skip-reason", "no-wait-timeout", "no-sleep", "no-serial", "forbidden-locators", "e2e-no-browser", "test-layers"];
const lines = LINE_RULES.some(on) ? addedTestLines(base, head, args.includes("--all")) : [];
const newFiles = base ? git("diff", "--name-only", "--diff-filter=A", `${base}...${head}`).split("\n").filter(Boolean) : [];
if (on("skip-reason")) checkSkips(lines);
if (on("no-sleep")) checkWaits(lines, "no-sleep");
else if (on("no-wait-timeout")) checkWaits(lines, "no-wait-timeout");
if (on("no-serial")) checkSerial(lines);
if (on("forbidden-locators")) checkLocators(lines);
if (on("e2e-no-browser")) checkE2eBrowser(lines, newFiles);
if (on("bare-refs")) checkBareRefs();
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
  console.log(`process guard: ${problems.length} нарушений`);
  for (const p of problems) console.log(`- ${p}`);
  process.exit(1);
}
console.log(`process guard: зелёный${base ? ` (база ${base})` : ""}${body === null ? "; описание PR не передано — поля PR template не проверялись" : ""}`);

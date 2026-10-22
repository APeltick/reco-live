# reco-live

<!-- ai-kit:begin — раздел AI kit. AI kit installer вставляет его в CLAUDE.md проекта; обновление AI kit меняет только текст между метками. -->
## AI kit

Проект ведут AI team по AI kit: manager (с ним говорит человек), lead, executor-N, integrator-N, reviewer-N. Каждый человек ведёт свою AI team; договорённости между людьми — через issue tracker, PR и git. Всё, что меняет поведение продукта, — только через issue.

- **Термины** — только из словаря AI kit (`GLOSSARY.md` в папке AI kit у того, кто ведёт AI team): issue, change, task, task batch, brief, draft PR, `ai-review`, gate, merge group, returned PR, AI model tier, …
- **Файлы AI kit в проекте** — `ai-team-docs/` (карта — его `README.md`): настройки флоу `config/project-overlay.md`, роли и люди `config/roles.md`, модели `config/models.md`, MCP для agents `config/mcp.json` (у каждого — только серверы, которые он включил у себя), ATD — решения о работе AI team `atd/`.
- **Поведение продукта** — в спеках OpenSpec (`openspec/specs/`); решения «как и почему» о продукте — ADR проекта (`docs/adr/` или `adr_dir`). Решение — файл «как решено сейчас», рядом история (`history/`); поменялось — правится тот же файл с записью в истории, номер не меняется. ADR и ATD принимает только человек; так же — PR, который меняет правила команды (`ai-team-docs/config/`, `.github/ai-team/`, CI AI kit, этот раздел, настройки Claude Code проекта — `.claude/settings*.json`, `.claude/hooks/`, `.mcp.json`): вливается только по слову человека с номером PR.
- **Каждая task в `tasks.md`** — с AI model tier: `[strong]`, `[standard]` или `[light]`. `[x]` ставит автор в своём PR.
- **Тесты** — самый нижний слой, на котором проверка ещё ловит дефект: unit / integration / e2e (spec/05 AI kit).
- **PR** — draft PR по PR template (`Tasks:`, `E2E:`, `Test layers:`, `Screenshots:`, `Proof:`, `Depends on:`, `Issue:`, `Models:`). Ревью ставит статус `ai-review`; влитие — по project overlay; integration branch защищена.
- **Секреты**: `.env*` не читать целиком; имена переменных — `ai-team env-keys <файл>`. В текстах на хостинг (PR, комментарии) — без секретов: известный вид ключа или значение env-файла guard не пропустит.
- **Процессы**: свои server — `ai-team server start|stop`; `pkill`/`killall` запрещены.

### При compact сохранить

id agent и роль; текущий task batch и brief; task в работе и их статус; ветку, worktree, PR и PR dossier; изменённые файлы; блокеры и открытые вопросы; последнюю команду проверки и её итог; решения в этой сессии.
<!-- ai-kit:end -->

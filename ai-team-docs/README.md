# ai-team-docs — файлы AI kit в этом проекте

Здесь лежит всё, что **без AI kit смысла не имеет** (DEC-0049). Удалите AI kit — папка уходит целиком (через PR). Что переживёт удаление (ADR о продукте, спеки) — не здесь.

**Кто правит:** только через PR (spec PR пишет lead, решает человек). Скрипты AI kit читают эти файлы — формат таблиц не ломать (spec/01).

## Карта

Process guard проверяет, что каждый файл этой папки есть в карте: новый файл без строки здесь — красный PR.

| Путь | Что | Кто правит |
|---|---|---|
| `README.md` | эта карта | lead через spec PR |
| `config/project-overlay.md` | настройки флоу под проект: команды, пути, правила, расписание | lead через spec PR, решает человек |
| `config/roles.md` | роли и люди AI team | lead через spec PR; строка человека — при установке |
| `config/models.md` | модели, effort, лимиты, цены | lead через spec PR, решает человек |
| `config/mcp.json` | MCP-серверы, которые получают agents (только они, `--strict-mcp-config`); шаблон — `{ "mcpServers": {} }`, секреты — только ссылкой `${ИМЯ}` | installer (впитанные и из плана); потом lead через spec PR, решает человек |
| `atd/` | ATD — решения о работе AI team в этом проекте: файл решения, история в `atd/history/`, индекс в `atd/README.md`; свой номер (spec/13) | lead через spec PR, принимает человек |
| `setup/pending-setup.md` | командная pending setup (spec/14) | lead через spec PR; `ai-team doctor` отмечает сделанное в `state/pending-status.json`, `done` переносит lead своим spec PR |

## Чего здесь нет и почему

| Что | Где | Почему не здесь |
|---|---|---|
| ADR о продукте | `docs/adr/` (или `adr_dir` в overlay) | переживают удаление AI kit |
| спеки поведения | `openspec/` | ищет OpenSpec |
| CI | `.github/workflows/pr-checks.yml`, `full-tests.yml` (метка `# managed by AI kit`) | ищет GitHub |
| process guard | `.github/ai-team/` | запускает CI |
| PR template | `.github/pull_request_template.md` | ищет GitHub |
| правила для ИИ | `CLAUDE.md` (раздел AI kit между метками), `.claude/` (файлы с приставкой `ai-team-`) | ищет Claude Code |
| личное и состояние | `.ai-team/` в папке проекта, вне git | не командное |

Сюда нельзя: секреты, личные настройки, машинное состояние, код продукта.

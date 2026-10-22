# Project overlay — reco-live

Настройки флоу AI kit под этот проект. Командный файл: меняется через PR. Заполняет AI kit installer по разведке проекта и ответам человека; `<…>` — подставить.

Правила формата (файл читают скрипты AI kit): каждый раздел — `## <id>`, под ним **одна** таблица; первая колонка — ключ. Пустое значение — `—`. Комментарии — обычным текстом вне таблиц.

## project

| key | value | что это |
|---|---|---|
| name | reco-live | имя проекта |
| hosting | github | хостинг репозитория |
| integration_branch | main | ветка, куда вливаются все PR |
| branch_types | feature, bugfix, hotfix | типы веток `<тип>/<person>/<task-batch-id>` (DEC-0052): исправление ошибки — `bugfix`, остальное — `feature`, `hotfix` — только по слову человека |
| merge_method | squash | merge / squash / rebase |
| merge_authority | human | кто вливает (spec/04 §4): `human` / `merge-queue` / `integrator` |
| human_approval_required | no | нужно ли одобрение PR человеком сверх `ai-review` и CI (approve другого человека: свой PR одобрить нельзя) |
| issue_tracker | github-issues | github-issues / jira / linear / task-manager / none |
| has_database | no | yes / no — `no` выключает шаги миграций в gate; в CI шаг миграций идёт, если у него есть команда (`commands`) |
| ai_kit_min_version | 0.3.0-dev | минимальная версия AI kit для этого проекта |
| timezone | Europe/Chisinau | часовой пояс команды: в нём время ночного full в CI (`schedule` → `nightly_full`) и границы суток в `ai-team stats`; задачи watchdog — по часам машины |

## commands

Шаг без команды (`—`) gate пропускает (в pending setup его не пишет: отложенное при установке туда кладёт installer). `{port}` подставляет AI kit.

| step | command | что это |
|---|---|---|
| install | npm ci --legacy-peer-deps | установка зависимостей (только если менялись файлы зависимостей) |
| codegen | — | генерация кода (например клиент базы) |
| typecheck | npm run typecheck | типы |
| lint | npm run lint | линт |
| unit | — | юниты без базы и process guard |
| integration | — | integration: код сервера и настоящая база в процессе теста, без браузера и без запущенного local server (spec/05); с базой — тяжёлое |
| build | npm run build | сборка; папка сборки — с суффиксом `.noindex` |
| preview_start | npm run preview -- --host 127.0.0.1 --port {port} --strictPort | local preview server из сборки |
| dev_start | npm run dev -- --host 127.0.0.1 --port {port} --strictPort | local dev server |
| health_path | / | путь health check |
| memory_limit_mb | 4096 | лимит памяти local server |
| e2e | — | e2e (файлы спек дописывает AI kit); число воркеров передаёт AI kit: Playwright — `--workers=N`, другие — `{workers}` в команде |
| e2e_smoke | — | короткий набор: главные экраны и вход |
| e2e_setup | — | подготовка e2e в CI (браузеры) |
| e2e_shards | 4 | на сколько частей резать full e2e lane в CI |
| migrations_newer | — | проверка: миграция PR новее последней в integration branch |
| migrations_schema | — | проверка: схема = миграции на пустой базе |
| openspec_validate | openspec validate --all --strict | проверка спек |
| process_guard | node .github/ai-team/process-guard.mjs | process guard AI kit для gate и prefilter (правила — раздел `process-guard`); CI зовёт файл `.github/ai-team/process-guard.mjs` сам, эту строку не читает |
| screenshot | {playwright} screenshot --full-page --viewport-size=1280,800 {url} {file} | снимок экрана для `ai-team screenshots` (`{playwright}` — node_modules/.bin/playwright проекта, без npx; `{url}`, `{file}` подставляет AI kit) |

## paths

| kind | globs | что это |
|---|---|---|
| risky | *.config.*, package.json, package-lock.json, src/app/store/**, src/shared/api/** | risky paths: полное ревью (full — как у всех: в CI, без живого CI — в gate) |
| security_tests | — | тесты безопасности и изоляции данных: без повторов и без quarantine |
| docs_only | docs/**, openspec/**, *.md | изменения только здесь — лёгкий gate |
| e2e_dir | tests/e2e | где лежат e2e |
| e2e_browser_marker | — | признак браузера в тесте e2e (регулярное выражение) сверх `page`/`browser`/`context` у Playwright: свои фикстуры (`adminPage`, `app`) или другой инструмент; несколько — через запятую, без пробелов внутри (символ `|` в ячейке таблицы нельзя) |
| integration_dir | — | где лежат integration-тесты |
| adr_dir | docs/adr | ADR проекта (DEC-0049); ATD — решения о работе AI team — `ai-team-docs/atd/` |
| build_dir | dist | папка сборки gate |

## process-guard

Какие правила процесса проверяет process guard (`.github/ai-team/process-guard.mjs`, в CI и в gate). `yes` / `no`.

| rule | on | что |
|---|---|---|
| tier-labels | yes | у каждой task в `tasks.md` ровно одна метка `[strong]` / `[standard]` / `[light]` (spec/03 §2) |
| tasks-field | yes | `Tasks:` PR ↔ `[x]` в `tasks.md`: отмечено ровно заявленное, чужие галочки не сняты (spec/04 §5) |
| pr-fields | yes | поля PR template заполнены |
| adr | yes | ADR проекта: шаблон, правка — с записью в истории, номер не повторяется среди новых, решения не удаляются, индекс свежий (spec/13); ATD проверяются всегда |
| quarantine | yes | метки `@quarantine #<issue> до ДД.ММ.ГГГГ`: срок не прошёл, не больше 3, не тесты безопасности (spec/05 §6) |
| skip-reason | yes | новые `skip` / `fixme` — с причиной (`reason: …`) |
| e2e-no-browser | yes | новый тест в `e2e_dir` без браузера — «не e2e, перенеси в integration» (spec/05) |
| no-sleep | yes | новые строки тестов без «снов» (`waitForTimeout`, `sleep`); исключение — `reason:` |
| no-serial | yes | новые строки тестов без `serial` и зависимости от порядка; исключение — `reason:` |
| forbidden-locators | yes | новые строки тестов без запрещённых локаторов (раздел `forbidden-locators`) |
| test-layers | yes | поле PR `Test layers:`: каждый новый файл теста со слоем; у нового e2e — «почему не ниже» и «почему не шагом в существующий» |
| change-approved | yes | spec PR — поле «Change утвердил: <person>, <ГГГГ-ММ-ДД ЧЧ:ММ>, OI-N» и следующей строкой цитата слов человека «> …» (spec/03) |
| adr-human-merge | yes | PR с изменениями в папках ADR (любой файл в папке, кроме индекса `README.md`, шаблона AI kit `0000-template.md` и прежнего `areas.md`; MADR `0000-use-markdown-…` — решение) — в описании строка «ADR вступит в силу после влития» и метка `adr`. Само одобрение человека (на хостинге или его слово «вливай #N», `ai-team merge --permission OI-N`, только по номеру — не «вливай все») проверяет `ai-team merge` при влитии (spec/13) |
| team-docs-map | yes | файл в `ai-team-docs/`, которого нет в карте `ai-team-docs/README.md`, — красный PR |
| people-ids | yes | id в `ai-team-docs/config/roles.md → people` без повторов (регистр не в счёт): один id — одна AI team |
| bare-refs | no | ссылки на решения только `ADR-NNNN`, `ATD-NNNN`, `DEC-NNNN`, OQ в документах команды не упоминаются (spec/13 §7) |

## forbidden-locators

Запрещённые локаторы в новых строках тестов (правило `forbidden-locators`): шаблон — регулярное выражение.

| pattern | why |
|---|---|
| — | — |

## e2e-map

Какие e2e затронуты изменением пути (для targeted e2e lane). Неизвестный путь — только smoke и `E2E:` из PR.

| path | e2e |
|---|---|
| — | — |

## screenshot-masks

Что закрыть маской при сравнении снимков gate с approved screenshots (даты, номера, время). `rects` — прямоугольники `x,y,w,h` через «;», в пикселях снимка.

| route | rects |
|---|---|
| — | — |

## ports

Умолчания команды (DEC-0089): свои диапазоны — в `.ai-team/personal/machine.md` → `ports`, они главнее этих строк (порт занят другим проектом на машине — меняется у себя, без командного PR). Диапазоны не должны пересекаться с другими проектами на машине (проверяют AI kit installer и `ai-team doctor`). `ai-team add executor` требует строку для нового executor — здесь или у себя.

| agent | range |
|---|---|
| executor-1 | 4100-4109 |
| integrator-1 | 4130-4139 |
| integration-preview | 4140 |

## env

Своя база каждому executor (если `has_database = yes`). Умолчания команды (DEC-0089): `{person}` — id человека (у каждого своя база: `app_alex-peltik_executor_1`); id подставляется как есть, с «-»: в SQL такое имя базы пишут в двойных кавычках (`CREATE DATABASE "app_alex-peltik_executor_1"`) — если скрипты проекта создают базы без кавычек, задай имя базы без «-» у себя (`.ai-team/personal/machine.md` → `env`); свои env-файлы и базы — в `.ai-team/personal/machine.md` → `env`, они главнее этих строк. Файлы env — только путём от main checkout, без копирования в worktree; значения скрипты не печатают. `integration-preview` — local preview server integration branch: только своя строка; без неё он работает без env-файла и базы (с предупреждением в AI team journal), env gate не берёт.

| agent | env_file | database |
|---|---|---|
| — | — | — |

## bans

Проектные запреты (spec/10 §4): то, что нельзя всем (внешние сервера, общая база). Базовый набор AI kit действует всегда. Свой server и своя база — личные запреты в `.ai-team/personal/machine.md` → `bans`: они складываются с этими (DEC-0089). `pattern` — один или несколько шаблонов через «;»: `cmd:<regex>` (команда shell), `path:<glob>` (путь), `mcp:<regex>` (инструмент MCP), `port:<n>` (порт).

| id | pattern | why | instead |
|---|---|---|---|
| — | — | — | — |

## issue-tracker-adapter

Как делается каждое действие AI kit в этом issue tracker (spec/12 §5). Генерирует AI kit installer.

| action | how |
|---|---|
| find_free | gh issue list --state open --search 'no:assignee' |
| claim | gh issue edit <N> --add-assignee @me (только если assignees пусто) |
| set_status | метки status:* |
| link_pr | Refs #<N> в описании PR (не Closes: issue закрывает только человек) |
| update_breakdown | чеклист в конце issue |
| close_subtask | отметить пункт чеклиста |
| comment | gh issue comment <N> |
| flaky_issue | gh issue create --label flaky-test |

## issue-status-map

| meaning | tracker_status |
|---|---|
| free | open, без исполнителя |
| assigned | status:assigned |
| ready | status:ready |
| in-progress | status:in-progress |
| review | status:review |
| done | closed |

## schedule

Когда watchdog будит agents для периодических задач (spec/09 §5). Время задач watchdog — по часам машины: в распределённой команде у каждого — в его время; ночной full в CI (`nightly_full`) — в поясе команды `project.timezone`. Формат: `02:00` (каждый день), `daily 08:00`, `mon 09:00`.

| task | when | что |
|---|---|---|
| nightly_full | 02:17 | full e2e lane на голове integration branch — в CI по расписанию (`full-tests.yml`), не в начале часа |
| watch | every 5 min | watch: влитые PR, красный CI, набор ADR изменился (spec/09 §5) |
| full_check | daily 08:00 | был ли full на integration branch за 24 ч; нет — напоминание operator |
| pending_sync | mon 09:00 | lead: сделанные пункты командной pending setup — в spec PR |
| doctor | daily 08:00 | `ai-team doctor` |
| rotate | daily 04:00 | ротация AI team journal, чистка отчётов по `retention` |

## retention

| what | days | что |
|---|---|---|
| test_reports | 14 | локальные отчёты gate и CI-артефакты |
| screenshots_pending | 14 | снимки executor без PR |
| checkpoints | 7 | история checkpoint (и не больше 20 на agent) |
| messages | 7 | длинные сообщения agents (`state/messages/`) |
| drafts | 7 | черновики строки ввода (`state/drafts/`) |
| metrics | — | шаги расхода токенов (`state/metrics/steps/`): `—` — всегда; прошлые месяцы — zip (остальные замеры — маленькие, хранятся всегда) |

## data-policy

Куда можно отправлять код и данные проекта (провайдеры моделей, внешние сервисы). Действует для моделей через gateway (личный `models.md` → `gateways`): только `anthropic` с `yes` — модель не Claude через gateway нельзя (Claude через gateway — можно: vendor тот же); разрешены и другие — нельзя только vendor, которого нет в списке (vendor модели — `models.md` → `prices` → `vendor`). Иначе `ai-team model set --gateway` и AI kit installer откажут, `ai-team doctor` — ошибка. Раздела нет — только Anthropic. Поменять — PR сюда, решает команда.

| provider | allowed | note |
|---|---|---|
| anthropic | yes | — |

## limits

| key | value | что это |
|---|---|---|
| open_prs_per_executor | 5 | сколько невлитых PR может быть у executor (spec/03) |
| parallel_reviews | 3 | сколько review subagent reviewer запускает одновременно (spec/06) |
| e2e_workers_max | — | предел воркеров e2e; `—` — половина производительных ядер (spec/09 §2) |
| e2e_full_budget_min | — | бюджет времени full e2e lane, мин (spec/05) |
| e2e_audit_growth_pct | 20 | на сколько % full вырос с прошлого e2e audit — повод спросить operator про новый |
| heavy_hold_alert_min | 120 | живой держатель heavy lock держит дольше стольких минут — одно сообщение lead «кто и что держит» (spec/09 §2) |

## merge

| key | value | что это |
|---|---|---|
| fresh_base | yes | перед влитием — свежая база: merge queue или update branch и full в CI (spec/04); `no` — вливать без обновления |

## project-parts

Где работа (project part, spec/03 §3): пути → project part. Ставится без ИИ по файлам попытки.

| part | globs |
|---|---|
| frontend | src/**, public/**, index.html |

## task-types

Дополнения к закрытому списку типов задач (spec/03 §3). Пусто — только список AI kit.

| id | что |
|---|---|
| — | — |

## install-choices

Что выбрано при установке AI kit по пересечениям с правилами проекта (DEC-0047). Обновление AI kit берёт выбор отсюда; поменять — через PR.

| what | choice | что |
|---|---|---|
| claude_md | merge | раздел AI kit в CLAUDE.md: `merge` — между метками, `keep` — без раздела, `replace` — CLAUDE.md целиком от AI kit |
| pr_template | merge | поля AI kit в PR template: `merge` — блоком между метками, `keep` — без полей, `replace` — шаблон AI kit целиком |
| ci | render | CI AI kit: `render` — `pr-checks.yml` и `full-tests.yml` по project overlay (свои файлы — по метке `# managed by AI kit`), `none` — без CI AI kit |
| adr | ai-kit | ADR: `ai-kit` — `docs/adr` по spec/13, `keep-own` — свои ADR, правило `adr` process guard выключено |
| git_hooks | run | git-хуки проекта на коммитах AI kit installer: `run` — работают, `skip` — пропущены (причина — в AI kit setup report) |

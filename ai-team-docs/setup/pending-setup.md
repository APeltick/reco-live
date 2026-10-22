# AI kit pending setup — командная

Что отложено при установке и касается всей команды (spec/14). Личное — в `.ai-team/personal/pending-setup.md`. `ai-team doctor` проверяет реальное состояние и отмечает сделанное в `.ai-team/state/pending-status.json` (этот файл не меняет); `done` переносит lead своим spec PR.

Статусы: `pending` — напоминать; `done` — сделано; `declined` — сознательно не нужно, не напоминать.
Области напоминаний: `tests`, `gate`, `issue-tracker`, `repo`, `ci`, `session`.

<!-- Пример пункта:

### e2e
- что: e2e не настроены (нет конфигурации Playwright, нет e2e lane в gate)
- зачем: без e2e gate не проверяет экраны
- статус: pending
- напоминать при: tests, gate
- отложено: 2026-10-08, alex-peltik, «сейчас нет времени»
- отложено до: —
- проверка: playwright-config
-->

### branch-protection
- что: main не защищена: нет обязательных pr-result и ai-review, нет «up to date»
- зачем: без защиты в main может попасть непроверенное
- статус: pending
- напоминать при: repo, ci
- отложено: 2026-10-22, alex-peltik, «включаем после влития setup PR (живая проба)»
- отложено до: —
- проверка: branch-protection

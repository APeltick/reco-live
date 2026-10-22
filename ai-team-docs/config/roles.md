# Роли и люди AI team

Командный файл. Скрипты читают таблицу `people` (формат не ломать: раздел `## <id>`, под ним одна таблица). Таблица `roles` — только для людей: роли, их зоны и права задаёт AI kit (spec/02), правка здесь их не меняет.

id ролей фиксированные — по ним скрипты понимают роль (spec/01 §6). Своё имя agent для человека («Решала» вместо `lead`) — личное: `.ai-team/personal/agents.md` → `name`.

## roles

Для людей: что делает каждая роль (скрипты эту таблицу не читают).

| id | zone |
|---|---|
| manager | разговор с operator, доска, разбор тикета, доклады, operator question; ничего не правит — пишет lead |
| lead | тикет, change OpenSpec, ADR, `ai-team-docs/` через spec PR; brief; ведёт работу agents |
| executor | свой worktree; `[x]` своих task |
| integrator | merge queue, gate, local preview server integration branch |
| reviewer | ревью, статус `ai-review`, `picture.md` |

## people

id человека — slug из `git config user.name`, уникальный в команде без учёта регистра (spec/01 §6). Один id — одна AI team: на второй машине того же человека — свой id (`alex-laptop`) и своя строка. `login` — логин на хостинге (AI kit installer берёт его у хостинга): по нему присоединение узнаёт, что id уже твой.

| id | name | login |
|---|---|---|
| alex-peltik | Alex Peltik | APeltick |

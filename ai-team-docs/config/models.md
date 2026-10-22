# Модели AI team

Командный файл (spec/07 §2): **умолчания** команды (DEC-0011) — какой уровень (AI model tier) у каждой роли, точная модель на каждом уровне, effort, точка compact, лимиты шагов. Своё поверх — `.ai-team/personal/models.md`: любая модель на любой уровень или agent, без разрешения команды и без PR (модель не Claude через gateway — в пределах project overlay → `data-policy`). При `ai-team up` значения попадают в описания agents и subagent (spec/07 §3).

Формат читают скрипты: разделы `## <id>`, под каждым одна таблица.

## tiers

Точная модель на каждом уровне — только здесь (и в личном `models.md`); только точные версии, не псевдонимы (DEC-0043). Читает `ai-team up`: слоты Claude Code (`ANTHROPIC_DEFAULT_*_MODEL`) и модели agents; `max_turns` — предел шагов subagent `impl-*` этого уровня (effort задаёт имя типа: `impl-light-medium`). Строка `fable` — одна попытка в конце ladder (spec/07 §5): убрать её — ladder кончается шагом раньше. Пример: новая Sonnet — поменять `model` строки `standard`.

| tier | model | max_turns |
|---|---|---|
| strong | claude-opus-5-5 | 230 |
| standard | claude-sonnet-5-5 | 215 |
| light | claude-haiku-5-5 | 80 |
| fable | claude-fable-5-1 | 230 |

## agents

Уровень, effort и точка compact каждой роли (spec/07 §3, spec/08 B1). Модель agent — модель его уровня из `tiers`. `compact_at` — **фактическая** точка compact в токенах. Пример: `executor | strong | medium | 300000` — executor на модели уровня strong, effort medium.

| agent | tier | effort | compact_at |
|---|---|---|---|
| manager | strong | high | 400000 |
| lead | strong | high | 400000 |
| executor | strong | medium | 300000 |
| integrator | strong | high | 300000 |
| reviewer | strong | high | 300000 |

## reviews

Предел шагов review subagent (spec/06). Модель — слот из описания (`review-strong-high` — strong), effort — из имени типа (у `review-adr` — high). Строка того же типа в `subagents` (ниже) главнее.

| review | max_turns |
|---|---|
| review-strong-high | 150 |
| review-standard-medium | 80 |
| review-adr | 150 |

## subagents

Другие типы subagent: `audit-e2e` (e2e audit, spec/05) и agents, впитанные из проекта при установке (приставка `ai-team-`, DEC-0082). Хук пропускает собранные типы: `impl-*` уровней из `tiers`, все `review-*` и `audit-e2e` AI kit (строка здесь меняет им уровень, effort и предел шагов — и в описании, и для хука, который считает, что ревью упёрлось в лимит; у `review-*` без строки здесь предел — из `reviews`, нет и там — умолчания) и agents проекта `ai-team-*` со строкой здесь; другой тип — нет.

| type | tier | effort | max_turns | что |
|---|---|---|---|---|
| audit-e2e | strong | high | 150 | e2e audit: одна область набора e2e за раз |

## prices

Цены моделей за 1M токенов — для замеров (`ai-team stats`, spec/07 §10). Цена зависит от длины запроса — строка `<модель> >100k` (пробел перед `>` не обязателен): запрос (вход, запись и чтение кэша) больше 100k токенов идёт по ней, иначе — по строке модели. Модель без строки или с «—» — цена в замерах пустая. Цены своих моделей (другой vendor, gateway) — в личном `models.md`; своя строка модели заменяет все её строки здесь. Обновляет команда, когда меняются цены.

| model | input | cache_write_5m | cache_write_1h | cache_read | output |
|---|---|---|---|---|---|
| claude-opus-5-5 | 4 | 5 | 8 | 0.20 | 20 |
| claude-sonnet-5-5 | 2 | 2.5 | 4 | 0.10 | 10 |
| claude-haiku-5-5 | 0.10 | 0.125 | 0.20 | 0.01 | 0.50 |
| claude-haiku-5-5 >100k | 0.50 | 0.625 | 1 | 0.05 | 2.50 |
| claude-haiku-4-5-20251001 | 1 | 1.25 | 2 | 0.10 | 5 |
| claude-fable-5-1 | 10 | 12.5 | 20 | 0.25 | 50 |

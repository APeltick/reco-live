## Why

The OpenSpec CLI version differs by place: CI installs the latest `@fission-ai/openspec@1` (1.17.0 on 2026-11-11), this machine has a global 1.10.0. Spec PR #53 was `valid` locally and red in CI — 1.17 `--strict` rejects requirement texts over 500 characters. The operator does not update the global CLI (other projects on the machine) and asked to pin the version in the project (OI-1114: «закрепите @fission-ai/openspec@1.17.0 как devDependency проекта и вызывайте через npx/скрипт npm, чтобы локально, в gate и в CI была одна версия. Отдельным PR, lead решает сам.»).

## What Changes

- `@fission-ai/openspec` 1.17.0 (exact) in `devDependencies`; `package-lock.json` updated.
- npm script `spec:validate` = `openspec validate --all --strict` — npm runs the project's own `node_modules/.bin/openspec`, never the global one.
- `docs/commands/README.md` lists `npm run spec:validate`.
- Not in this change (team-rules PR by lead, after this is merged): project overlay `commands.openspec_validate` → `npm run spec:validate` and `ai-team ci render`, so gate and CI call the same script. The overlay must not name a script that does not exist yet.

## Capabilities

### New Capabilities

— none

### Modified Capabilities

— none. Developer tooling only (`skip_specs: true`).

## Impact

- `package.json`, `package-lock.json` (risky paths — full review), `docs/commands/README.md`.
- Updating OpenSpec later = a PR that bumps the pin (and fixes specs the new version rejects) — no surprise from CI.

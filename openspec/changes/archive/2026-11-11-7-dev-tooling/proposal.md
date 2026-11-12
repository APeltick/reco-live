## Why

Three developer-tooling gaps, taken together because they all change `package.json` and `package-lock.json` (one executor, one branch, no lockfile conflicts between parallel PRs). Operator: «executor-2 и executor-3 берут #22, #44, #7 (потом #48, #49)» (OI-987).

1. **Screenshots (#7).** The project has no Playwright, so the screenshot path of the team flow does not work: the project overlay command `screenshot` (`{playwright} screenshot …`) expects the project's own `node_modules/.bin/playwright`, so `ai-team screenshots capture`, approving screenshots and the screenshot comparison in gate all fail. In PR #6 screenshots had to be taken with a temporary tool outside the project.
2. **`minimatch` advisory (#44).** `npm audit --package-lock-only` reports a non-breaking fix for GHSA-g3hv-75wg-m249 through `eslint-plugin-import-x`: 4.18.1 accepts `minimatch` `^9.0.3 || ^10.1.2 || ^11.0.1`; the project pins 4.17.1.
3. **No unit tests (#48).** The project has no test runner and no unit test; a broken JSON or HTTP-error path in `src/shared/api` is caught by nobody before the browser.

## What Changes

- **Playwright (#7):** `@playwright/test` 1.65.0 (exact) in `devDependencies`. It provides the `playwright` CLI the overlay command uses. `docs/installation/README.md` gets the one-time browser step (`npx playwright install chromium`). No e2e tests, no e2e config, no overlay `e2e*` commands.
- **import-x (#44):** `eslint-plugin-import-x` 4.17.1 → 4.18.1 (exact). The `minimatch` entry of `docs/issues/README.md` is brought in line with the new lockfile and audit output (the advisory stays open while other consumers keep `minimatch@10.2.5`).
- **Vitest (#48):** `vitest` 5.1.0 (exact) in `devDependencies`; script `npm run test` (`vitest run`); `npm run check` runs it; first unit tests for `src/shared/api/parse-json.ts` and `src/shared/api/request.ts` (network error, non-2xx, allowed status, abort, missing API URL) with a stubbed `fetch`. Docs of the commands list the new script.
- **Not here:** unit tests of the product schemas (from #48) move to change `22-dummyjson-catalog`: the schema changes to the DummyJSON shape there, the tests are written once against the new shape. The CI step (`commands.unit` in the project overlay + `ai-team ci render`) is a team-rules PR by lead after this change is merged — the overlay must not name a command that does not exist yet.

## Capabilities

### New Capabilities

— none

### Modified Capabilities

— none. Developer tooling only: no product behavior changes (`skip_specs: true`).

## Impact

- `package.json`, `package-lock.json` (risky paths — full review), `vite.config.ts` or a new `vitest.config.ts` (risky: `*.config.*`), `eslint.config.js` only if the test files need it, `docs/installation/README.md`, `docs/commands/README.md`, `docs/issues/README.md`, new `src/shared/api/*.test.ts`.
- Every developer and agent worktree needs the Chromium download once (about 150 MB) to take screenshots.
- `docs/issues/README.md` `minimatch` entry is also changed by PR #45 (change `39-readme-and-minimatch-entry`): task 2.1 is done on a base that already has #45 merged.

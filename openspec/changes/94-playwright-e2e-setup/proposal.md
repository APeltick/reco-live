## Why

The project has no e2e (issue #94): overlay `commands.e2e`, `e2e_smoke` and `e2e_setup` are `—`, there is no `playwright.config.*` and no `tests/e2e/`. Browser behaviour — history, keyboard, debounce, latest-wins, pagination, the product page — is proven only by manual preview runs and screenshots in PRs, and issue #82 (catalog e2e) is blocked until e2e exists. The operator asked for an e2e setup change (OI-1924) and decided its forks: Chromium only (OI-1932); the API stubbed with `page.route` on `https://dummyjson.com` and JSON fixtures in `tests/e2e/fixtures/` (OI-1935); the CI lane on now, with 1 shard (OI-1938); the smoke test is catalog → product → `Back to products` (OI-1942).

## What Changes

- `playwright.config.ts` at the root that follows the AI kit contract (spec/05): the address from `PLAYWRIGHT_BASE_URL` / `BASE_URL` / `PORT`, `webServer` that starts the preview server and reuses a running one (`reuseExistingServer`), Chromium only, `testDir: tests/e2e`, no retries of its own (the kit passes `--retries`), no fixed workers (the kit passes `--workers`).
- `tests/e2e/fixtures/` — JSON responses of DummyJSON and a small helper that routes `https://dummyjson.com/**` to them, so no test reaches the live API.
- `tests/e2e/smoke.spec.ts` — one `@smoke` test: `/product` shows the stubbed list and total → open a product → its title and price → `Back to products` → the list again.
- Tooling around it: an npm script `test:e2e`, the TypeScript and ESLint coverage of `playwright.config.ts` and `tests/e2e/`, `.gitignore` for Playwright output.
- The overlay: `commands.e2e`, `e2e_smoke`, `e2e_setup` filled, `e2e_shards` 4 → 1; the AI kit CI re-rendered from it (`ai-team ci render`): an `e2e-targeted` job on PRs and `full-tests.yml` (before merge and nightly; `full-result` required). This part is a team-rules change.

No product behaviour changes (`skip_specs: true`).

## Capabilities

### New Capabilities

— none

### Modified Capabilities

— none

## Impact

- New: `playwright.config.ts`, `tests/e2e/**`. Changed: `package.json` (script only; `@playwright/test` 1.65.0 is already a devDependency), `tsconfig*.json`, `eslint.config.js`, `.gitignore` — `package.json` and `*.config.*` are risky paths (full review).
- Team rules: `ai-team-docs/config/project-overlay.md`, `.github/workflows/*` (rendered). Merged only by the operator's word with the PR number.
- Gate and CI start running e2e on every PR (smoke + the PR's `E2E:` tests); CI installs Chromium (`e2e_setup`).

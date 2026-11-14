## Context

The AI kit runs e2e through the overlay: gate starts its own preview server and passes the address in `PORT`, `BASE_URL` and `PLAYWRIGHT_BASE_URL`; the main runs use `--retries=1` and `--reporter=list,json`; workers come as `--workers=N` (spec/05). CI (`ai-team ci render`) adds the e2e jobs once `commands.e2e` is set. The app reads the API host at build time (`VITE_APP_API_URL`); the overlay build bakes in `https://dummyjson.com` (#74). `@playwright/test` 1.65.0 is already a devDependency and is used today only for screenshots (`commands.screenshot`).

## Goals / Non-Goals

Goals: a working e2e lane in local runs, gate and CI; deterministic tests with no live network; one smoke test of the main path.

Non-goals: the catalog behaviour tests (issue #82); other browsers (OI-1932); visual comparison (screenshots stay a separate kit mechanism).

## Decisions

- **Config contract.** `use.baseURL` = `PLAYWRIGHT_BASE_URL ?? BASE_URL ?? http://127.0.0.1:${PORT ?? 4173}`. `webServer`: `npm run preview -- --host 127.0.0.1 --port <port> --strictPort`, `url` = the base URL, `reuseExistingServer: true` — gate's server is reused; a local run starts one from an existing `dist` (build first). No `retries` and no `workers` in the config. One project, `chromium` (Desktop Chrome device). `testDir: tests/e2e`; only `*.spec.ts` there (spec/05: an e2e config owns its folder; no units).
- **API stub.** A helper in `tests/e2e/fixtures/` (e.g. `mockDummyJson(page, overrides?)`) calls `page.route("https://dummyjson.com/**", …)` and answers from JSON files there: products list (10 items, total 194), categories, one product. Anything not matched → `route.abort()` so a missing fixture fails loudly instead of reaching the live API. Fixtures are copied into `tests/e2e/fixtures/` (not imported from `src/**/__fixtures__`), so e2e and unit fixtures change independently.
- **Smoke** (OI-1942), tagged `@smoke` in the title: open `/product` → 10 product titles and `194 products found` → click the first title → `/products/<id>` shows its title and price → `Back to products` → `/product` with the list. Role- and text-based locators (`getByRole`, `getByText`), no `waitForTimeout`, no `serial`.
- **Overlay values.** `e2e`: `npx playwright test`; `e2e_smoke`: `npx playwright test --grep @smoke`; `e2e_setup`: `npx playwright install --with-deps chromium`; `e2e_shards`: `1` (OI-1938). The kit adds `--workers`, `--retries` and the reporter. The e2e map stays `—` for now: unknown paths run smoke plus the PR's `E2E:` (#82 adds rows).
- **Order.** The overlay must not name `commands.e2e` before the config and the smoke test are on main (gate and CI would find 0 tests — a tooling stop). So task 1.1 (code, an executor PR, ordinary merge) goes first; task 2.1 (overlay + `ai-team ci render`, a lead PR) follows, and is merged only by the operator's word with the PR number.

## Risks / Trade-offs

- [CI time] Each PR now installs Chromium and runs smoke; full runs before merge and nightly. One shard keeps the job count low; shards can grow in the overlay.
- [A local run needs a build] `webServer` serves `dist`; without a build the preview shows a stale or missing app. `test:e2e` documents it; gate always builds first.
- [The build bakes in the API host] Tests stub exactly `https://dummyjson.com`; a different `VITE_APP_API_URL` in a local build would bypass the stub and the abort-on-unmatched rule would fail the test — intended.

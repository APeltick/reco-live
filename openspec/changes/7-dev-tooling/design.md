## Context

See proposal.md — Why. AI kit takes screenshots with the project overlay command `screenshot`: `{playwright} screenshot --full-page --viewport-size=1280,800 {url} {file}`, where `{playwright}` is the project's local `node_modules/.bin/playwright` (never `npx`, which would download from the network). New external dependencies (`@playwright/test`, `vitest`) — the OpenSpec condition for a design.

## Goals / Non-Goals

**Goals:**
- `ai-team screenshots capture` works in any worktree after `npm ci` and the one-time browser install.
- `npm run test` runs fast unit tests without a browser, network or server; `npm run check` fails when a test fails.
- `eslint-plugin-import-x` on the release that accepts `minimatch@11`.

**Non-Goals:**
- e2e tests, `playwright.config`, overlay `e2e` / `e2e_smoke` / `e2e_setup` commands, CI browser install — a separate decision when the project gets e2e.
- Component tests (React Testing Library, jsdom) — not needed for the first tests; added when a task needs them.
- Coverage thresholds.

## Decisions

- **`@playwright/test`, not `playwright` or `playwright-core`**: it ships the same `playwright` CLI and is the package e2e will need later, so the dependency does not change when e2e arrive. `playwright-core` has no browser management; `playwright` would be replaced by `@playwright/test` later anyway.
- **Exact versions** (`.npmrc` `save-exact=true`): `@playwright/test` 1.65.0 (published 2026-11-05), `vitest` 5.1.0 (published 2026-11-02; peer `vite ^6.4.0 || ^7.0.0 || ^8.0.0` — the project has `vite` 8.3.5; engines include Node 24), `eslint-plugin-import-x` 4.18.1. All installs with `--legacy-peer-deps` (known issue `eslint-plugin-jsx-a11y` and ESLint 10, `docs/issues/README.md`).
- **Chromium only** (`npx playwright install chromium`): screenshots need one browser; all browsers would be ~3× the download.
- **Vitest, not Jest**: the project builds with Vite; Vitest reuses `vite.config.ts` (path aliases through `vite-tsconfig-paths`, ESM, TypeScript) with no extra transform setup.
- **Node environment, explicit imports**: tests run in the `node` environment (`fetch`, `Response`, `Headers` are global in Node 24) and import `describe`/`it`/`expect`/`vi` from `vitest` — no globals, so `tsconfig` needs no global test types. `import.meta.env.VITE_APP_API_URL` is set per test with `vi.stubEnv`; `fetch` is replaced with `vi.stubGlobal` and restored after each test.
- **Test files next to the code** (`*.test.ts` in `src/`), so the existing `tsconfig.app.json` (`include: ["src"]`) type-checks them; the production build does not import them.
- **`npm run check` = typecheck → lint → test → build**: tests are cheaper than the build and fail earlier.

## Risks / Trade-offs

- [Browser download per machine, ~150 MB] → one-time, documented; without it capture fails with a clear Playwright message.
- [Peer conflict with the ESLint 10 tree] → install with `--legacy-peer-deps` as the known issue prescribes.
- [Lint rules (sonarjs, unicorn, security) flag test idioms] → adjust only for `**/*.test.ts` in `eslint.config.js`, each relaxation named in the PR; no global rule change.
- [CI does not run the tests until the overlay names `commands.unit`] → lead's team-rules PR right after this change is merged; until then the tests run in `npm run check` locally and in the executor's prefilter.

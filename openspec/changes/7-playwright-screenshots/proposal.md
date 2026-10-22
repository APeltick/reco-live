## Why

The project has no Playwright, so the screenshot path of the team flow does not work: the project overlay command `screenshot` (`{playwright} screenshot …`) expects the project's own `node_modules/.bin/playwright`, so `ai-team screenshots capture`, approving screenshots and the automatic screenshot comparison in gate all fail. In PR #6 screenshots had to be taken with a temporary tool outside the project (issue #7).

## What Changes

- `@playwright/test` (exact version, 1.64.1) added to `devDependencies`; `package-lock.json` updated. It provides the `playwright` CLI the overlay command uses.
- Installation docs get the one-time browser install step for screenshots (`npx playwright install chromium`).
- No e2e tests, e2e config or overlay `e2e` commands in this change — Playwright here is only the screenshot tool; it is also the base for e2e later.

## Capabilities

### New Capabilities

— none

### Modified Capabilities

— none. Developer tooling only: no product behavior changes (`skip_specs: true`).

## Impact

- `package.json`, `package-lock.json` (risky paths — full review), `docs/installation/README.md`.
- Every developer and agent worktree needs the Chromium download once (about 150 MB) to take screenshots.
- Touches the same files as change `5-dependency-audit` (#5): implement after it, rebase on it.

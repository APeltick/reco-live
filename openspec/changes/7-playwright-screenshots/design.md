## Context

See proposal.md — Why. AI kit takes screenshots with the project overlay command `screenshot`: `{playwright} screenshot --full-page --viewport-size=1280,800 {url} {file}`, where `{playwright}` is the project's local `node_modules/.bin/playwright` (never `npx`, which would download from the network).

## Goals / Non-Goals

**Goals:**
- `ai-team screenshots capture` works in any worktree after `npm ci` and the one-time browser install.

**Non-Goals:**
- e2e tests, `playwright.config`, overlay `e2e` / `e2e_smoke` / `e2e_setup` commands, CI browser install — a separate decision when the project gets e2e.

## Decisions

- **`@playwright/test`, not `playwright` or `playwright-core`**: it ships the same `playwright` CLI and is the package e2e will need later, so the dependency does not change when e2e arrive. `playwright-core` has no browser management; `playwright` would be replaced by `@playwright/test` later anyway.
- **Exact version 1.64.1** (latest), saved exact as the rest of `package.json` (`.npmrc`).
- **Chromium only** (`npx playwright install chromium`): screenshots need one browser; all browsers would be ~3× the download.

## Risks / Trade-offs

- [Browser download per machine, ~150 MB] → one-time, documented; without it capture fails with a clear Playwright message.
- [Peer conflict with ESLint 10 tree] → install with `--legacy-peer-deps` as the known issue prescribes.

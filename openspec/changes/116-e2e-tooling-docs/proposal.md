## Why

The verify of change `94-playwright-e2e-setup` (reviewer-1, 2026-11-14, CRITICAL 0) left two warnings outside any change: `docs/commands/README.md` has no `npm run test:e2e` (`package.json` scripts), and `docs/eslint/README.md` describes the strict tooling scope (`tsconfig.node.json`, the tooling ESLint block) as `vite.config.ts` only, while it now also covers `playwright.config.ts` and `tests/e2e/**` (`tsconfig.node.json` `include`, `eslint.config.js`). The operator opened issue #116 for it (OI-212).

## What Changes

- `docs/commands/README.md`: a row for `npm run test:e2e`.
- `docs/eslint/README.md`: the tooling scope names `vite.config.ts`, `playwright.config.ts` and `tests/e2e/**`.

Docs only (`skip_specs: true`).

## Capabilities

### New Capabilities

— none

### Modified Capabilities

— none

## Impact

- Changed: `docs/commands/README.md`, `docs/eslint/README.md`. No code, no config.

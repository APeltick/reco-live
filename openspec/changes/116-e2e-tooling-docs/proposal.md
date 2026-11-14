## Why

The verify of change `94-playwright-e2e-setup` (reviewer-1, 2026-11-14, CRITICAL 0) left two warnings outside any change: `docs/commands/README.md` has no `npm run test:e2e` (`package.json` scripts), and `docs/eslint/README.md` describes the strict tooling scope (`tsconfig.node.json`, the tooling ESLint block) as `vite.config.ts` only, while it now also covers `playwright.config.ts` and `tests/e2e/**` (`tsconfig.node.json` `include`, `eslint.config.js`). The operator opened issue #116 for it (OI-212). The verify of change `106-drop-legacy-peer-deps` (reviewer-1, 2026-11-14, CLEAN) left three doc suggestions; the operator added them to this change (OI-290): `docs/package/README.md` has no row for the new `overrides` field, `docs/installation/README.md` speaks of "a global npm override" while `package.json` now has a scoped one, and `docs/hooks/README.md` repeats the peer-dependency policy of `docs/development/README.md` and `docs/issues/README.md`.

## What Changes

- `docs/commands/README.md`: a row for `npm run test:e2e`.
- `docs/eslint/README.md`: the tooling scope names `vite.config.ts`, `playwright.config.ts` and `tests/e2e/**`.
- `docs/package/README.md`: a row for `overrides` (the `tsconfck` → root TypeScript pin, linked to its known issue).
- `docs/installation/README.md`: "a global npm override" → "`legacy-peer-deps` in `.npmrc`".
- `docs/hooks/README.md`: the peer-dependency policy becomes one sentence with links to where it is stated in full.

Docs only (`skip_specs: true`).

## Capabilities

### New Capabilities

— none

### Modified Capabilities

— none

## Impact

- Changed: `docs/commands/README.md`, `docs/eslint/README.md`, `docs/package/README.md`, `docs/installation/README.md`, `docs/hooks/README.md`. No code, no config.

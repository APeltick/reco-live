## Why

The verify of change `116-e2e-tooling-docs` (reviewer-1, 2026-11-14, CLEAN) found one WARNING. Task 1.2 (#123) shortened the "Peer-dependency policy" of `docs/hooks/README.md` to one sentence with links, and two clauses of the old text are now stated nowhere: a peer-dependency bypass only when the affected package is necessary, and revisiting the exception whenever dependencies are upgraded. The same verify listed small doc gaps outside that change: the `docs/eslint/README.md` file table has no `playwright.config.ts` row, two comments in `eslint.config.js` (`:180`, `:336`) name only Vite, and the `docs/package/README.md` rows for `scripts` and `devDependencies` do not mention e2e or `@playwright/test`. The operator opened issue #125 for it (OI-424, low priority) and took it into work (OI-426).

## What Changes

- `docs/issues/README.md`, "Peer-dependency conflicts": the two clauses come back, stated once.
- `docs/eslint/README.md`: a `playwright.config.ts` row in the file table.
- `eslint.config.js`: the comments at `:180` and `:336` name the whole tooling scope (comments only, no rule change).
- `docs/package/README.md`: the `scripts` row mentions the e2e command, and the `devDependencies` row mentions `@playwright/test`.

Docs and comments only (`skip_specs: true`).

## Capabilities

### New Capabilities

— none

### Modified Capabilities

— none

## Impact

- Changed: `docs/issues/README.md`, `docs/eslint/README.md`, `docs/package/README.md`, `docs/development/README.md` (its restatement of the exception rule became a link to the full policy, #131), `eslint.config.js` (comments only). No behaviour, no rule, no config value changes.

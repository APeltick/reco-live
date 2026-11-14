## Why

Executor-3 and reviewer-1 found three inexact statements on PR #131 (change 125), outside that change's files. `docs/installation/README.md:47` says that `playwright.config.ts` "starts that server itself", but the config always sets `webServer` with `reuseExistingServer: true` (`playwright.config.ts:23-25`). `docs/commands/README.md:13` names only `PLAYWRIGHT_BASE_URL`, while the base URL is `PLAYWRIGHT_BASE_URL ?? BASE_URL ?? http://127.0.0.1:<PORT>` (`playwright.config.ts:6-9`). The clause "no compatible update or replacement exists", which #123 dropped from `docs/hooks/README.md`, came back in #131 only in intent. The operator opened #132 (OI-505, low priority) and took it into work (OI-520).

## What Changes

- `docs/installation/README.md`: the server sentence says that a server already answering at the base URL is reused, and otherwise one is started.
- `docs/commands/README.md`: the `test:e2e` row names the base URL order.
- `docs/issues/README.md` "Peer-dependency conflicts": the exception bullet states the clause "no compatible update or replacement exists" verbatim.

Docs only (`skip_specs: true`).

## Capabilities

### New Capabilities

— none

### Modified Capabilities

— none

## Impact

- Changed: `docs/installation/README.md`, `docs/commands/README.md`, `docs/issues/README.md`. No code, no config.

## Why

Follow-up of the review of PR #54 (change `7-dev-tooling`, issue #57; opened by lead on the operator's standing rule OI-1171). Since #54 `npm run check` runs typecheck → lint → test → build, but two docs still describe it without tests; and three paths of `src/shared/api/request.ts` have no unit test.

## What Changes

- `docs/installation/README.md:41` and `docs/eslint/README.md:99` — describe `npm run check` with the unit tests step (order as in `package.json`).
- `src/shared/api/request.test.ts` — three more tests: `domain` overrides `VITE_APP_API_URL`; a throwing `sendErrorReport` does not replace the original `RequestError`; a body that cannot be serialized throws `RequestError("Request body cannot be serialized as JSON.")` with `cause` and `fetch` is not called.
- `request.ts` itself is not changed. A test that reveals a real defect — stop and report, not a silent fix.

## Capabilities

### New Capabilities

— none

### Modified Capabilities

— none. Docs and tests only (`skip_specs: true`).

## Impact

- `docs/installation/README.md`, `docs/eslint/README.md`, `src/shared/api/request.test.ts` (risky path `src/shared/api/**` — tests only).

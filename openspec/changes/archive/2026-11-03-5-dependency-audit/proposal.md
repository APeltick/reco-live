## Why

`npm audit --audit-level=high` reports 19 vulnerabilities (15 high, 4 moderate), so the pre-push hook step "Audit production dependencies" (`npm run audit`) blocks every push; the team currently pushes with this one step excluded (issue #5). One production dependency is affected (`react-router` 8.2.0, GHSA-qwww-vcr4-c8h2 — RSC mode, not used by this SPA), the rest are dev tooling.

## What Changes

- `react-router` 8.2.0 → 8.5.0 (production; fixes GHSA-qwww-vcr4-c8h2).
- `vite` 8.1.1 → 8.3.5 (dev; fixes the launch-editor and dev-server advisories).
- Transitive dev dependencies fixed by `npm audit fix` without `--force` (lockfile only).
- `npm run audit` checks production dependencies only (`--omit=dev`), as the hook step name says. The remaining dev-only advisory — `braces` (GHSA-vfj7-8cjw-p6xm) pulled in by `stylelint` — has no fixed release; it is recorded in `docs/issues/README.md` with a removal plan.
- After this change a normal `git push` passes; `LEFTHOOK_EXCLUDE` is no longer needed.

## Capabilities

### New Capabilities

— none

### Modified Capabilities

— none. Dependency and tooling change only: no product behavior changes (`skip_specs: true`).

## Impact

- `package.json`, `package-lock.json` (risky paths — full review), `docs/issues/README.md`.
- Routing library minor upgrade: `/`, `/product`, unknown URLs (404) must work as before.
- CI is not changed here (no `npm audit` step in CI) — see design, Open Questions.

## Why

The known-issues register `docs/issues/README.md` no longer matches `npm audit` after the zod fix (#14, PR #21):

- The `braces` entry (GHSA-vfj7-8cjw-p6xm) is stale: a full `npm audit` on `main` 60412bc no longer reports `braces`, and the advisory was withdrawn on 2026-10-23. The entry's own removal plan says to remove it once `npm audit` no longer reports `braces`.
- A full `npm audit` reports 32 moderate findings, all from one advisory: `minimatch` <11.0.1, GHSA-g3hv-75wg-m249 (denial of service via globparts amplification). It is reached only through the ESLint toolchain (dev dependencies); the only fix `npm audit` offers is semver-major downgrades of lint plugins (for example `eslint-plugin-react-dom` 1.5.3). There is no entry for it (verify of change 14-zod-update, reviewer-1).

Operator: OI-280 (take #20 after zod), OI-391 («а» — one docs PR: remove `braces`, add `minimatch`).

## What Changes

- Remove the `braces` GHSA-vfj7-8cjw-p6xm entry from `docs/issues/README.md`.
- Add a `minimatch` GHSA-g3hv-75wg-m249 entry by the file's template: dev-only via ESLint, why the pre-push audit does not see it (production-only `npm run audit`), safe temporary procedure and what must not be done (no `npm audit fix --force`), tracking links, removal plan.

## Capabilities

### New Capabilities

— none

### Modified Capabilities

— none. Documentation only: no product behavior changes (`skip_specs: true`).

## Impact

- `docs/issues/README.md` only (docs_only — light gate).
- No dependency, script or code change. `npm run audit` (production-only) stays green.

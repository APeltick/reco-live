## Why

The known-issues register `docs/issues/README.md` no longer matches `npm audit` after the zod fix (#14, PR #21):

- The `braces` entry (GHSA-vfj7-8cjw-p6xm) is stale: a full `npm audit` on `main` 60412bc no longer reports `braces`, because the advisory was withdrawn on 2026-10-23 (`withdrawn_at` set). `braces@3.0.3` itself stays in the lockfile (dev, via `stylelint`). The entry's own removal plan says to remove it once `npm audit` no longer reports `braces`.
- A full `npm audit` reports 32 moderate findings, all from one advisory: `minimatch` <11.0.1, GHSA-g3hv-75wg-m249 (denial of service via globparts amplification). A fixed release exists (`minimatch` 11.0.1, published 2026-10-27), but the ESLint toolchain does not allow it: `eslint`, `@eslint/config-array`, `@typescript-eslint/typescript-estree`, `eslint-plugin-sonarjs` and others depend on `minimatch` ^10.x, and `eslint-plugin-jsx-a11y` on ^3.x. So `npm audit` shows "No fix available" except via semver-major changes of lint plugins. Two copies are installed, both dev-only: `minimatch` 10.2.5 and 3.1.5 (under `eslint-plugin-jsx-a11y`). There is no entry for it (verify of change 14-zod-update and review of this spec PR, reviewer-1).

Operator: OI-280 (take #20 after zod), OI-391 (one docs PR: remove `braces`, add `minimatch`), OI-413 («а» — `minimatch` is documentation only: a fix exists, the ESLint chain does not allow it, do not force it; remove the entry when both copies are ≥ 11.0.1 through plugin updates).

## What Changes

- Remove the `braces` GHSA-vfj7-8cjw-p6xm entry from `docs/issues/README.md`.
- Add a `minimatch` GHSA-g3hv-75wg-m249 entry by the file's template: a fixed release exists (11.0.1+), but the ESLint toolchain's version ranges do not allow it; dev-only; why the pre-push audit does not see it (production-only `npm run audit`); the safe temporary procedure and what must not be done (no `npm audit fix --force`, no `overrides` forcing `minimatch` 11); tracking links; removal plan — when both installed copies are ≥ 11.0.1 through updates of the lint plugins themselves.

## Capabilities

### New Capabilities

— none

### Modified Capabilities

— none. Documentation only: no product behavior changes (`skip_specs: true`).

## Impact

- `docs/issues/README.md` only (docs_only — light gate).
- No dependency, script or code change; forcing `minimatch` 11 via `overrides` is out of scope by the operator's decision (OI-413): it is a semver-major change under ~15 lint packages and `eslint-plugin-jsx-a11y` expects the `minimatch` 3 API, so lint could break or silently stop checking files. `npm run audit` (production-only) stays green.

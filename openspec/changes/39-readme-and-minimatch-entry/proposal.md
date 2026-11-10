## Why

**#39.** `README.md:23` (section `Quick start`) still says `Before opening a pull request or submitting the project, run:`. "Submitting the project" is a leftover of the project template (handing the template in as an assignment), not a rule of Reco Live. Found by the reviewer in the review of #38 (change `36-status-page-and-readme`).

**#29.** The `minimatch` GHSA-g3hv-75wg-m249 entry in `docs/issues/README.md` (added in #28, change `20-known-issues-audit`) is right in substance — dev-only, reached through the ESLint toolchain, do not force it — but its facts no longer match the lockfile and the advisory data. Issue #29 lists three inaccuracies found in the verify of change 20; the review of spec PR #43 (reviewer-1, confirmed by lead with a live `npm audit --package-lock-only` on 2026-11-10, `main` c2dac33) found that the advisory data changed since then. On the operator's word (OI-833, option "а") the whole entry is brought in line with the current audit — text only.

Facts on 2026-11-10 (`main` c2dac33):

- **Advisory range** is `>=7.0.0 <11.0.1` (`npm audit` prints `minimatch  7.0.0 - 11.0.0`). Of the two copies in the lockfile only `minimatch@10.2.5` is affected; `minimatch@3.1.5` (under `eslint-plugin-jsx-a11y`) is outside the range, and `eslint-plugin-jsx-a11y` is not reported.
- **Direct consumers of `minimatch@10.2.5`** (declared ranges in `package-lock.json`): `eslint-plugin-import-x@4.17.1` (`^9.0.3 || ^10.1.2`), `@typescript-eslint/typescript-estree` 8.62.0 and nested 8.64.0 copies (`^10.2.2`), `@eslint/config-array@0.23.5` (`^10.2.4`), `eslint@10.6.0` (`^10.2.4`), `eslint-plugin-sonarjs@4.2.0` (`^10.2.5`). `eslint-plugin-sonarjs` does not depend on `@typescript-eslint/typescript-estree`. `eslint` and `eslint-plugin-sonarjs` are exact-pinned direct devDependencies.
- **`npm audit fix --force`** installs other, older majors: `eslint` 10.6.0 → 9.39.5 (and `@eslint/js` → 9.39.5), `eslint-plugin-sonarjs` 4.2.0 → 2.0.0, `eslint-plugin-unicorn` 72.0.0 → 65.0.1; only `typescript-eslint` stays on its major but goes older (8.62.0 → 8.36.0). These break the current ESLint configuration and leave the exact pins.
- **Non-breaking fix exists for one package:** `eslint-plugin-import-x` 4.17.1 → 4.18.1 (`isSemVerMajor: false`, published 2026-11-09; declares `^9.0.3 || ^10.1.2 || ^11.0.1`). So "npm audit offers only semver-major, breaking fixes" is no longer true. Taking it is a dependency change — a separate issue #44 (OI-833), not in this change; even after it the other consumers keep `minimatch@10.2.5`, the advisory stays open.

## What Changes

- **#39** — on the operator's word (OI-822, option "а"): `README.md:23` becomes exactly `Before opening a pull request, run:`. Nothing else in `README.md` changes.
- **#29** — the `minimatch` entry in `docs/issues/README.md` is rewritten where its facts differ from the list above (text only; the structure of the entry and its sections stay):
  1. **Subject / Description / Affected** — the affected range is `>=7.0.0 <11.0.1`; only `minimatch@10.2.5` in this lockfile is affected; `minimatch@3.1.5` is present but outside the range (no longer "versions below 11.0.1", "before 11.0.1", "`10.2.5` and `3.1.5`").
  2. **Consumer tree** — still the `npm ls minimatch --package-lock-only` view: under `minimatch@10.2.5` add `eslint-plugin-sonarjs@4.2.0 (declares ^10.2.5)` and `eslint@10.6.0 (declares ^10.2.4)` as direct consumers, remove `eslint-plugin-sonarjs` from the "used by" list of `@typescript-eslint/typescript-estree`; `minimatch@3.1.5` stays in the tree, marked as outside the affected range.
  3. **What `npm audit` reports** — the paragraph after the tree: which packages are reported (not `eslint-plugin-jsx-a11y`); a non-breaking fix exists only for `eslint-plugin-import-x` (4.18.1, issue #44); the fix offered for the rest is `npm audit fix --force`, a breaking change.
  4. **Temporary resolution** — the expected outputs of the check commands match today's output (`npm audit --package-lock-only`: `minimatch 7.0.0 - 11.0.0` moderate; `npm ls`: both copies still present). The `npm audit fix --force` bullet: it installs other, older majors (`eslint` 9, `eslint-plugin-sonarjs` 2, `eslint-plugin-unicorn` 65) and an older `typescript-eslint` within its major — this breaks the current ESLint configuration and leaves the exact pins; the prohibition stays. The `overrides` bullet: the installed lint packages declare ranges that exclude 11.x. The audit-fix bullets must not claim that only semver-major fixes exist.
  5. **Removal plan** — "lint package (direct devDependency)" instead of "lint plugin" (`eslint` is the core, not a plugin), the placeholder `<lint-package>` in the command block too; the criterion: update each package that depends on an affected copy to a version whose declared `minimatch` range lets the lockfile resolve to `>= 11.0.1`, then check that no copy in the affected range is left; the entry becomes obsolete when no installed copy is in `>=7.0.0 <11.0.1` (`npm audit --package-lock-only` no longer lists `minimatch`), not "when every copy is 11.0.1 or newer".
  6. Along the way — the typo at :79 (entry `eslint-plugin-jsx-a11y`) `from the all docs` → `from all docs`.
- Docs only: no product behavior, code, `package.json` or `package-lock.json` change.

### Decisions made in this change

- **#39 and #29 in one change** — both are small docs-only fixes taken together by the operator (OI-814); two independent tasks with no shared files.
- **#29 widened to the whole entry** (OI-833, option "а") instead of only the three points of the issue: the issue's premise about `npm audit fix --force` is stale, and leaving other false lines in an entry being corrected would keep it wrong. The `eslint-plugin-import-x` update is split off to issue #44 (no executor).

## Capabilities

### New Capabilities

— none

### Modified Capabilities

— none. Docs only (`skip_specs: true`).

## Impact

- `README.md` — line 23 only.
- `docs/issues/README.md` — the `minimatch` entry and the typo at :79.
- No risky paths, no dependencies, no API or data changes.

## Why

**#39.** `README.md:23` (section `Quick start`) still says `Before opening a pull request or submitting the project, run:`. "Submitting the project" is a leftover of the project template (handing the template in as an assignment), not a rule of Reco Live. Found by the reviewer in the review of #38 (change `36-status-page-and-readme`).

**#29.** The `minimatch` GHSA-g3hv-75wg-m249 entry in `docs/issues/README.md` (added in #28, change `20-known-issues-audit`) is right in substance (dev-only, through ESLint, do not force), but its consumer tree and two sentences are inaccurate (verify of change 20, reviewer-1). Checked again against `package-lock.json` on `main` c2dac33: `eslint-plugin-sonarjs@4.2.0` declares `minimatch` `^10.2.5` and `eslint@10.6.0` declares `^10.2.4` directly — both are direct devDependencies in `package.json`.

## What Changes

- **#39** — on the operator's word (OI-822, option "а"): `README.md:23` becomes exactly `Before opening a pull request, run:`. Nothing else in `README.md` changes.
- **#29** — the `minimatch` entry in `docs/issues/README.md`, exactly as listed in the issue:
  1. **Consumer tree (:101–103)** — under `minimatch@10.2.5` add `eslint-plugin-sonarjs@4.2.0 (declares ^10.2.5)` and `eslint@10.6.0 (declares ^10.2.4)` as direct consumers; remove `eslint-plugin-sonarjs` from the "used by" list of `@typescript-eslint/typescript-estree`. The tree then matches `npm ls minimatch --package-lock-only`, and the Removal plan sees every direct consumer.
  2. **:129** — the `npm audit fix --force` bullet: npm offers the same majors of the lint plugins, but older versions; the fix is breaking because it leaves the exact pins (`--save-exact`) of the current configuration. The prohibition itself stays.
  3. **:144** — the removal criterion: update each lint package (direct devDependency) that depends on an old copy to a version whose declared `minimatch` range allows only `>= 11.0.1` (instead of "lint plugin" and "range excludes 10.x and 3.x" — `^9` excludes them too, and `eslint` is the core, not a plugin).
  4. Along the way — the typo at :79 `from the all docs` → `from all docs`.
- Docs only: no product behavior, code, dependency or lockfile change.

### Decisions made in this change

- **#39 and #29 in one change** — both are small docs-only fixes taken together by the operator (OI-814); two independent tasks with no shared files.

## Capabilities

### New Capabilities

— none

### Modified Capabilities

— none. Docs only (`skip_specs: true`).

## Impact

- `README.md` — line 23 only.
- `docs/issues/README.md` — the `minimatch` entry (tree, :129, :144) and the typo at :79.
- No risky paths, no dependencies, no API or data changes.

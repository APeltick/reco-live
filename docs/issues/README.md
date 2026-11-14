# Known issues

This file is the register of known project issues that cannot be fixed at the moment. It records the current impact, the reason a permanent fix is unavailable, and the safe temporary procedure. Do not use it for ordinary bugs that can be fixed in the same change.

Each issue must have a clear title, subject, description, temporary resolution, tracking links, and removal plan. Include the affected packages and exact versions when applicable. Links are mandatory: add the relevant upstream GitHub issue, package tracker, documentation, release notes, or article that explains the problem. They make the workaround verifiable and give maintainers a place to monitor for a permanent fix.

When a new known issue is found, copy this template, fill in every section, and add it below the existing entries:

````md
## <Short issue title>

### Subject

<One-sentence statement of the affected area and the user or developer impact.>

### Description

<Explain what fails, why it cannot be permanently fixed yet, and which packages, versions, environments, or project areas are affected.>

### Temporary resolution

<Provide the exact safe workaround and commands. State any limitations, risks, and actions that must not be taken.>

### Tracking links

- <Required: upstream GitHub issue, package tracker, or equivalent primary source>
- <Optional: relevant documentation, release notes, bug report, or article>

### Removal plan

<State the event that makes the workaround obsolete, such as a package release or an upstream fix. List the exact commands and verification steps required to remove it.>
````


## Peer-dependency conflicts

A peer-dependency conflict is not a known issue by itself. Before accepting any workaround:

- Try the install without flags first, for example `npm install <package> --save-dev`, and read the reported dependency chain.
- Inspect the chain with `npm explain <package>` and `npm ls <package>`.
- Prefer a real fix: a compatible version of the package or its peer dependency, or a compatible alternative.
- Never set `legacy-peer-deps=true` in `.npmrc`: it suppresses peer-dependency validation for the whole project and can hide unrelated conflicts.
- A flag for a single command is acceptable only for an understood, documented exception. Record it here as a known issue with the template above, including the exact package, versions, reason, upstream tracking link and the removal criteria.

## `minimatch` GHSA-g3hv-75wg-m249 — dev-only denial of service via globparts amplification

### Subject

Development-only lint tooling pulls in `minimatch@10.2.5`, which is inside the affected range `>=7.0.0 <11.0.1` of a moderate denial-of-service advisory (GHSA-g3hv-75wg-m249); the production bundle, its runtime dependencies, and the production audit gate (`npm run audit`) are not affected.

### Description

`minimatch` in the range `>=7.0.0 <11.0.1` is vulnerable to denial of service through globparts amplification, where a crafted glob pattern makes matching do disproportionate work. Advisory: [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), severity moderate. The first fixed release is `minimatch@11.0.1`.

The fixed release cannot be adopted directly because the lint toolchain does not allow it. The lockfile contains one copy, as shown by `npm ls minimatch --package-lock-only`, and it is in the affected range:

```text
minimatch@10.2.5                                   (affected: inside >=7.0.0 <11.0.1)
├── eslint-plugin-import-x@4.18.1                  (declares ^9.0.3 || ^10.1.2 || ^11.0.1; resolves to 10.2.5)
├── eslint-plugin-jsx-a11y-x@0.2.0                 (declares ^10.2.5)
├── @typescript-eslint/typescript-estree           (8.62.0 and nested 8.64.0 copies; declares ^10.2.2; used by eslint-plugin-perfectionist, eslint-plugin-react-dom, eslint-plugin-react-x, typescript-eslint and others)
├── @eslint/config-array@0.23.5                    (declares ^10.2.4; used by eslint)
├── eslint@10.6.0                                  (declares ^10.2.4)
└── eslint-plugin-sonarjs@4.2.0                    (declares ^10.2.5)
```

Because the declared ranges of the other consumers of `minimatch@10.2.5` exclude `11.x`, the lockfile cannot resolve to the fixed release without updating those packages; `eslint-plugin-import-x@4.18.1` accepts `^11.0.1`, but it shares the single `minimatch@10.2.5` copy with them. `npm audit --package-lock-only` lists `minimatch 7.0.0 - 11.0.0` as moderate and reports the lint packages that depend on the affected copy directly or through `eslint`: `eslint`, `@eslint/config-array`, `eslint-plugin-sonarjs`, `eslint-plugin-jsx-a11y-x`, `typescript-eslint` and the `@typescript-eslint/*` packages (`typescript-estree`, `utils`, `parser`, `type-utils`, `eslint-plugin`) reach it directly, while `@eslint/js` and `eslint-plugin-unicorn` reach it only through their peer dependency on `eslint`. `eslint-plugin-import-x` is no longer reported after the update to 4.18.1 (issue #44). The update of `eslint-plugin-import-x` from 4.17.1 to 4.18.1 (issue #44) did not remove the affected copy: the lockfile still resolves `minimatch@10.2.5` for import-x, and no non-breaking fix is left. `npm audit --json` reports `isSemVerMajor: true` for every fix it names (`eslint` 9.39.5, `eslint-plugin-sonarjs` 2.0.0, `eslint-plugin-unicorn` 65.0.1, `typescript-eslint` 8.36.0, `@eslint/js` 9.39.5, `eslint-plugin-jsx-a11y-x` 0.1.1), and only a plain `true` for `@eslint/config-array`, `@typescript-eslint/eslint-plugin` and `@typescript-eslint/type-utils`, which follow from those forced fixes. `npm audit fix` changes nothing; only `npm audit fix --force` does, and it is a breaking change. The advisory stays open while the other consumers keep `minimatch@10.2.5`.

The affected copy is reached only through `devDependencies`: `npm ls minimatch --omit=dev --package-lock-only` is empty. The pre-push gate `npm run audit` is production-only (`npm audit --omit=dev --audit-level=high`), so it does not see this advisory and passes while this entry is open. A plain `npm audit` still reports it. The exposure is limited to developer machines and CI jobs that run ESLint against file patterns the project controls, not to user input or the running application.

It cannot be permanently fixed yet because the fix requires the lint packages to accept `minimatch@11` in their own dependency ranges, which is an upstream change to those packages.

Affected: `minimatch` in `>=7.0.0 <11.0.1`; in this lockfile only `minimatch@10.2.5`, through the lint toolchain listed above. Not affected: the production build and its runtime dependencies.

### Temporary resolution

Keep the lint toolchain at its current versions and do not force the advisory. Verify the state with:

```sh
npm ls minimatch --omit=dev --package-lock-only   # expected: empty, exit code 1 (not in production)
npm ls minimatch --package-lock-only              # expected: a single minimatch@10.2.5 (affected) under the lint packages
npm audit --package-lock-only                     # expected: minimatch 7.0.0 - 11.0.0 listed as moderate
npm run audit                                     # expected: exit code 0 (production-only gate)
```

Limitations and actions that must not be taken:

- Do not run `npm audit fix --force`: it installs other, older majors (`eslint` 10.6.0 to 9.39.5 with `@eslint/js`, `eslint-plugin-sonarjs` 4.2.0 to 2.0.0, `eslint-plugin-unicorn` 72.0.0 to 65.0.1, `eslint-plugin-jsx-a11y-x` 0.2.0 to 0.1.1) and an older `typescript-eslint` within its major (8.62.0 to 8.36.0). This breaks the current ESLint configuration and leaves the exact version pins.
- Do not add `overrides` that force `minimatch` to 11 (team decision OI-413: this entry is documentation only). Every installed `minimatch` consumer except `eslint-plugin-import-x` declares a range that excludes 11.x (`eslint`, `@eslint/config-array`, `eslint-plugin-sonarjs`, `eslint-plugin-jsx-a11y-x`, and the `@typescript-eslint/typescript-estree` copies), so forcing it breaks their dependency contract.
- Do not pick a lint package version from the `npm audit` output. Choose versions only after checking their declared `minimatch` range and release notes.
- Do not add an ignore tool (`audit-ci`, `better-npm-audit` or similar) only to silence this advisory.
- Do not switch the `audit` script to a full `npm audit` without a decision from the team, because the pre-push gate would then fail on a dev-only issue with no non-breaking fix for the reported packages.

### Tracking links

- [GitHub Advisory GHSA-g3hv-75wg-m249 (minimatch, denial of service via globparts amplification)](https://github.com/advisories/GHSA-g3hv-75wg-m249)
- [Upstream security advisory in the minimatch repository](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249)
- [minimatch v11.0.1 tag (first fixed version)](https://github.com/isaacs/minimatch/releases/tag/v11.0.1)
- Optional: [APeltick/reco-live issue #5 (project tracking for the dependency audit)](https://github.com/APeltick/reco-live/issues/5)

### Removal plan

The workaround becomes obsolete when no installed `minimatch` copy is in the affected range `>=7.0.0 <11.0.1` (`npm audit --package-lock-only` no longer lists `minimatch`). This must happen through updates of the lint packages themselves, not through `overrides`. Update each package that depends on an affected copy (for transitive consumers such as `@typescript-eslint/typescript-estree` or `@eslint/config-array`, update the direct devDependency that brings them: `typescript-eslint`, `eslint`, `eslint-plugin-jsx-a11y-x` or `eslint-plugin-sonarjs`) to a version whose declared `minimatch` range lets the lockfile resolve to `>=11.0.1` (check it with `npm view <package>@<version> dependencies.minimatch`), then verify:

```sh
npm install <lint-package>@<version> --save-dev --save-exact
npm ls minimatch --package-lock-only   # expected: no copy in >=7.0.0 <11.0.1
npm audit --package-lock-only          # expected: minimatch no longer listed
npm ci
npm run check
npm run audit
```

If any copy in the affected range remains, keep this entry. Otherwise remove it from `docs/issues/README.md`.

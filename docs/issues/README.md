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


## `--legacy-peer-deps` - `eslint-plugin-jsx-a11y` and ESLint 10

### Subject

`npm install` is temporarily blocked by a peer-dependency mismatch in the required accessibility linting stack.

### Description

The project uses `eslint@10.6.0`. `eslint-plugin-jsx-a11y@6.10.2` declares peer support only through ESLint 9, so a normal `npm install` can reject the dependency tree even when adding an unrelated package.

`eslint-plugin-jsx-a11y` is not optional for this project: it provides the JSX accessibility checks in the ESLint configuration. Those checks catch static accessibility problems such as missing labels, invalid ARIA attributes, incorrect semantic elements, and keyboard-accessibility issues.

### Temporary resolution

For a clean checkout, install the locked dependency tree with:

```sh
npm ci --legacy-peer-deps
```

When an installation or dependency update is blocked by this known conflict, use:

```sh
npm install <package> --save-dev --legacy-peer-deps
```

Do not add `legacy-peer-deps=true` to `.npmrc`: that would globally suppress peer-dependency validation and could hide unrelated conflicts. The flag must remain explicit and limited to this documented exception.

Before using it, first try the install without the flag and inspect the reported dependency chain:

```sh
npm install <package> --save-dev
npm explain eslint-plugin-jsx-a11y
npm ls eslint eslint-plugin-jsx-a11y
```

Check for a compatible version of either package or a suitable alternative before accepting the workaround.

### Tracking links

Upstream tracks ESLint 10 support in [eslint-plugin-jsx-a11y issue #1075](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/issues/1075). The issue is open; monitor it and the plugin release notes when upgrading dependencies.

### Removal plan

Once the plugin declares ESLint 10 support, remove `--legacy-peer-deps` from all docs and lockfile-verification commands, regenerate `package-lock.json` with a normal `npm install`, then run:

```sh
npm ci
npm run check
npm run audit
```

## `minimatch` GHSA-g3hv-75wg-m249 — dev-only denial of service via globparts amplification

### Subject

Development-only lint tooling pulls in `minimatch@10.2.5`, which is inside the affected range `>=7.0.0 <11.0.1` of a moderate denial-of-service advisory (GHSA-g3hv-75wg-m249); the production bundle, its runtime dependencies, and the production audit gate (`npm run audit`) are not affected.

### Description

`minimatch` in the range `>=7.0.0 <11.0.1` is vulnerable to denial of service through globparts amplification, where a crafted glob pattern makes matching do disproportionate work. Advisory: [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), severity moderate. The first fixed release is `minimatch@11.0.1`.

The fixed release cannot be adopted directly because the lint toolchain does not allow it. The lockfile contains two copies, as shown by `npm ls minimatch --package-lock-only`; only `minimatch@10.2.5` is in the affected range:

```text
minimatch@10.2.5                                   (affected: inside >=7.0.0 <11.0.1)
├── eslint-plugin-import-x@4.17.1                  (declares ^9.0.3 || ^10.1.2)
├── @typescript-eslint/typescript-estree           (8.62.0 and nested 8.64.0 copies; declares ^10.2.2; used by eslint-plugin-perfectionist, eslint-plugin-react-dom, eslint-plugin-react-x, typescript-eslint and others)
├── @eslint/config-array@0.23.5                    (declares ^10.2.4; used by eslint)
├── eslint@10.6.0                                  (declares ^10.2.4)
└── eslint-plugin-sonarjs@4.2.0                    (declares ^10.2.5)
minimatch@3.1.5                                    (not affected: outside >=7.0.0 <11.0.1)
└── eslint-plugin-jsx-a11y@6.10.2                  (declares ^3.1.2)
```

Because the declared ranges of the consumers of `minimatch@10.2.5` exclude `11.x`, the lockfile cannot resolve to the fixed release without updating those packages. `npm audit --package-lock-only` lists `minimatch 7.0.0 - 11.0.0` as moderate and reports the lint packages that depend on the affected copy: `eslint`, `@eslint/config-array`, `@eslint/js`, `eslint-plugin-import-x`, `eslint-plugin-sonarjs`, `eslint-plugin-unicorn`, `typescript-eslint` and the `@typescript-eslint/*` packages (`typescript-estree`, `utils`, `parser`, `type-utils`, `eslint-plugin`). `eslint-plugin-jsx-a11y` is not reported, because its copy `minimatch@3.1.5` is outside the affected range. A non-breaking fix (`isSemVerMajor: false`) exists only for `eslint-plugin-import-x` (4.17.1 to 4.18.1, tracked in issue #44); even after it, the other consumers keep `minimatch@10.2.5` and the advisory stays open. For the rest, the only fix offered is `npm audit fix --force`, which is a breaking change.

The vulnerable copies are reached only through `devDependencies`: `npm ls minimatch --omit=dev --package-lock-only` is empty. The pre-push gate `npm run audit` is production-only (`npm audit --omit=dev --audit-level=high`), so it does not see this advisory and passes while this entry is open. A plain `npm audit` still reports it. The exposure is limited to developer machines and CI jobs that run ESLint against file patterns the project controls, not to user input or the running application.

It cannot be permanently fixed yet because the fix requires the lint packages to accept `minimatch@11` in their own dependency ranges, which is an upstream change to those packages.

Affected: `minimatch` in `>=7.0.0 <11.0.1`; in this lockfile only `minimatch@10.2.5` (`minimatch@3.1.5` is present but outside the range), through the lint toolchain listed above. Not affected: the production build and its runtime dependencies.

### Temporary resolution

Keep the lint toolchain at its current versions and do not force the advisory. Verify the state with:

```sh
npm ls minimatch --omit=dev --package-lock-only   # expected: empty, exit code 1 (not in production)
npm ls minimatch --package-lock-only              # expected: minimatch@10.2.5 (affected) and minimatch@3.1.5 (not affected) under the lint packages
npm audit --package-lock-only                     # expected: minimatch 7.0.0 - 11.0.0 listed as moderate
npm run audit                                     # expected: exit code 0 (production-only gate)
```

Limitations and actions that must not be taken:

- Do not run `npm audit fix --force`: it installs other, older majors (`eslint` 10.6.0 to 9.39.5 with `@eslint/js`, `eslint-plugin-sonarjs` 4.2.0 to 2.0.0, `eslint-plugin-unicorn` 72.0.0 to 65.0.1) and an older `typescript-eslint` within its major (8.62.0 to 8.36.0). This breaks the current ESLint configuration and leaves the exact version pins.
- Do not add `overrides` that force `minimatch` to 11 (team decision OI-413: this entry is documentation only). The installed lint packages declare ranges that exclude 11.x, so forcing it breaks their dependency contract.
- Do not pick a lint package version from the `npm audit` output. Choose versions only after checking their declared `minimatch` range and release notes.
- Do not add an ignore tool (`audit-ci`, `better-npm-audit` or similar) only to silence this advisory.
- Do not switch the `audit` script to a full `npm audit` without a decision from the team, because the pre-push gate would then fail on a dev-only issue with no non-breaking fix for most of the reported packages.

### Tracking links

- [GitHub Advisory GHSA-g3hv-75wg-m249 (minimatch, denial of service via globparts amplification)](https://github.com/advisories/GHSA-g3hv-75wg-m249)
- [Upstream security advisory in the minimatch repository](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249)
- [minimatch v11.0.1 tag (first fixed version)](https://github.com/isaacs/minimatch/releases/tag/v11.0.1)
- Optional: [APeltick/reco-live issue #5 (project tracking for the dependency audit)](https://github.com/APeltick/reco-live/issues/5)

### Removal plan

The workaround becomes obsolete when no installed `minimatch` copy is in the affected range `>=7.0.0 <11.0.1` (`npm audit --package-lock-only` no longer lists `minimatch`). This must happen through updates of the lint packages themselves, not through `overrides`. Update each package that depends on an affected copy (for transitive consumers such as `@typescript-eslint/typescript-estree` or `@eslint/config-array`, update the direct devDependency that brings them: `typescript-eslint` or `eslint`) to a version whose declared `minimatch` range lets the lockfile resolve to `>=11.0.1` (check it with `npm view <package>@<version> dependencies.minimatch`), then verify:

```sh
npm install <lint-package>@<version> --save-dev --save-exact --legacy-peer-deps
npm ls minimatch --package-lock-only   # expected: no copy in >=7.0.0 <11.0.1
npm audit --package-lock-only          # expected: minimatch no longer listed
npm ci --legacy-peer-deps
npm run check
npm run audit
```

If any copy in the affected range remains, keep this entry. Otherwise remove it from `docs/issues/README.md`.

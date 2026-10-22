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

Once the plugin declares ESLint 10 support, remove `--legacy-peer-deps` from the all docs and lockfile-verification commands, regenerate `package-lock.json` with a normal `npm install`, then run:

```sh
npm ci
npm run check
npm run audit
```

## `braces` GHSA-vfj7-8cjw-p6xm — dev-only stack exhaustion via `stylelint`

### Subject

Development-only lint tooling on developer machines and CI pulls in `braces@3.0.3`, which is affected by a high-severity stack-exhaustion denial of service (GHSA-vfj7-8cjw-p6xm) through deeply nested brace patterns, and the production bundle does not contain it.

### Description

`braces` is vulnerable to stack exhaustion (denial of service) when it expands deeply nested brace patterns. Advisory: [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), severity high.

The vulnerable package is reached only through the lint toolchain:

```text
stylelint@17.14.0
└─┬ micromatch@4.0.8
  └─┬ braces@3.0.3
```

The chain continues through `fast-glob` and `globby`, both dependencies of `stylelint` (a direct dev dependency). The config packages `stylelint-config-recommended` and `stylelint-config-standard` only peer-depend on `stylelint` and are not in the `braces` path; they are listed here as the lint setup that the fix must keep working. `braces` is a `devDependencies`-only path: `npm ls braces --omit=dev` returns empty, and `npm audit --omit=dev` reports 0 vulnerabilities.

The exploit needs a deeply nested glob or brace pattern. In this project such patterns come only from the project's own stylelint configuration and file globs (`src/**/*.{css,ts,tsx}`), not from user input or the running application. Exposure is therefore limited to a developer or CI job that runs `npm run lint:styles` (or `npm run lint`) against patterns the project controls.

It cannot be permanently fixed yet because every published `braces` release, including the latest `3.0.3`, is inside the advisory range, so no fixed `braces` version exists for npm overrides to pin. `npm audit` suggests `npm audit fix --force`, which would install `stylelint@7.7.0` (a semver-major downgrade that removes the project's stylelint setup). That is not a fix for this project.

Affected: `braces@3.0.3` (all published versions), via `micromatch@4.0.8`, `fast-glob`, `globby`, `stylelint@17.14.0`, `stylelint-config-recommended` and `stylelint-config-standard@40.0.0`. Affected environment: developer machines and CI jobs that run stylelint. Not affected: the production build and its runtime dependencies. Scope of the audit gate is production only (`npm run audit`, `npm audit --omit=dev --audit-level=high`) because it reflects what users receive; the dev advisory stays visible through a plain `npm audit` and in this entry. Tracking issue in the project: [APeltick/reco-live#5](https://github.com/APeltick/reco-live/issues/5).

### Temporary resolution

Keep `stylelint` at the current version and do not force-fix this advisory. Verify the state with:

```sh
npm ls braces --omit=dev        # expected: empty (not in production)
npm ls braces                   # expected: braces@3.0.3 under micromatch under stylelint
npm audit --omit=dev --audit-level=high   # expected: found 0 vulnerabilities
npm audit                       # expected: braces listed as high; this is the accepted dev-only finding
```

The project gate `npm run audit` runs the production-only check and therefore passes while this issue is open.

Limitations and actions that must not be taken:

- Do not run `npm audit fix --force`: it downgrades `stylelint` to `7.7.0` and removes the lint setup.
- Do not add `overrides` for `braces` in `package.json`: no fixed version exists to override to.
- Do not add an ignore tool (`audit-ci`, `better-npm-audit` or similar) only to silence this advisory.
- Do not switch the `audit` script to a full `npm audit` without a decision from the team, because the build would then fail on a dev-only issue with no fix.
- Do not run lint styles with untrusted glob or pattern input (for example, patterns taken from a pull request description or an external file).

### Tracking links

- [GitHub Advisory GHSA-vfj7-8cjw-p6xm (braces, stack exhaustion through deeply nested patterns)](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
- [APeltick/reco-live issue #5 (project tracking for the dependency audit)](https://github.com/APeltick/reco-live/issues/5)
- Optional: [micromatch/braces repository](https://github.com/micromatch/braces) — check for a new release and its changelog.

### Removal plan

The workaround becomes obsolete when a `braces` release outside the advisory range is published, or when `stylelint` (or `micromatch`) is released with a `braces` dependency that is fixed. Then:

`stylelint` is pinned to an exact version in `package.json` (as all devDependencies are), so `npm update` does not bump it. Pick the command that matches the fix:

```sh
# A fixed stylelint release that brings a fixed braces (install the exact version, as the project pins devDependencies):
npm install stylelint@<fixed-version> --save-dev --save-exact --legacy-peer-deps

# Only braces/micromatch are fixed and stylelint stays at 17.14.0 (refresh the lockfile):
npm update braces micromatch --legacy-peer-deps

npm ls braces                              # expected: fixed braces version, no vulnerable copy
npm audit                                  # expected: braces no longer listed
npm run lint:styles
npm run check
```

If the team decides to audit dev dependencies too, change the `audit` script in `package.json` from `npm audit --omit=dev --audit-level=high` to `npm audit --audit-level=high`, then run `npm run audit`. In either case, remove this entry from `docs/issues/README.md` once `npm audit` no longer reports `braces`.

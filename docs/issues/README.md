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

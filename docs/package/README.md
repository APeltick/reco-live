# package.json reference

`package.json` is npm's machine-readable project manifest. It must remain valid JSON, so it cannot contain `//` or `/* ... */` comments. This document records the intent behind its sections.

| Field | Purpose |
| --- | --- |
| `name` | The local package name. |
| `private` | Prevents an accidental publication to the public npm registry. |
| `version` | The current local project version. |
| `type` | Enables native ECMAScript modules for configuration and tooling files. |
| `engines.node` | Limits supported Node.js releases to the project's tested range. |
| `scripts` | Defines the repeatable development, validation, build, preview, and audit commands. See [all commands](../commands/README.md). |
| `dependencies` | Runtime packages shipped with the application: React, React DOM, Material UI with Emotion, Redux, routing, and validation. |
| `devDependencies` | Local development and build tooling: Vite, TypeScript, ESLint and its plugins, Stylelint, type declarations, and the React Vite plugin. |
| `browserslist` | The browser baseline consumed by `eslint-plugin-compat` and reflected in Vite's production target. |

## Dependency policy

- Runtime packages belong in `dependencies`.
- Linters, build tools, type declarations, and editor-only tooling belong in `devDependencies`.
- `.npmrc` saves new versions exactly, avoiding automatic range expansion.
- `package-lock.json` must be committed with every dependency change.
- Use `npm ci` for a reproducible install from the lockfile.

## Browser baseline

The application targets:

```text
Chrome >= 117
Edge >= 121
Firefox >= 121
Safari >= 17
ios_saf >= 17
```

Update the `browserslist` entry and the Vite build target together when the supported-browser policy changes.

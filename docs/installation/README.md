# Installation

## Requirements

- Node.js `>=24.14.1 <25`
- npm, bundled with the selected Node.js release

The required Node.js version is stored in `.node-version`. New dependencies are saved as exact versions through `.npmrc`, and `package-lock.json` records the complete dependency tree.

## Install dependencies
⚠️ The current exception `--legacy-peer-deps` and its removal criteria are documented in [issues doc - eslint-plugin-jsx-a11y and ESLint 10](../issues/README.md). And don't forget adding if new issue will appear. ⚠️

For a clean, reproducible installation, use:

```sh
npm ci --legacy-peer-deps
```

Use `npm install` only when intentionally adding or updating dependencies. Commit both `package.json` and `package-lock.json` after such a change. This project has one temporary, explicitly documented peer-dependency exception; follow the [installation and update procedure](../development/README.md#install-and-update-dependencies) instead of enabling a global npm override.

## Verify the environment

```sh
node --version
npm --version
npm run check
```

`npm run check` type-checks the application, runs all linters, and creates a production build.

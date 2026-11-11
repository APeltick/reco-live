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

## Browsers for screenshots

Taking screenshots of the UI with `ai-team screenshots capture` needs a Chromium browser controlled by Playwright. Install it after `npm ci`:

```sh
npx --no-install playwright install chromium
```

- The step is needed only for UI screenshots (`ai-team screenshots capture`).
- It installs Chromium only, together with its headless shell. The download is about 300 MB and happens once per machine: the browser goes into the Playwright browser cache, which is shared by all worktrees, so later runs and other worktrees reuse it.
- `--no-install` makes `npx` use the project's own `playwright` CLI from `@playwright/test` (`devDependencies`). The CLI itself is not downloaded from the network.

## Verify the environment

```sh
node --version
npm --version
npm run check
```

`npm run check` type-checks the application, runs all linters, runs unit tests, and creates a production build.

## Configure the API

The product catalog is loaded from the public DummyJSON API. Put this line into your local env file (no secrets):

```sh
VITE_APP_API_URL=https://dummyjson.com
```

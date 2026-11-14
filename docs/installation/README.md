# Installation

## Requirements

- Node.js `>=24.14.1 <25`
- npm, bundled with the selected Node.js release

The required Node.js version is stored in `.node-version`. New dependencies are saved as exact versions through `.npmrc`, and `package-lock.json` records the complete dependency tree.

## Install dependencies
Known dependency issues and their temporary resolutions are listed in [the issues doc](../issues/README.md). Add new unresolved issues there using the documented template.

For a clean, reproducible installation, use:

```sh
npm ci
```

Use `npm install` only when intentionally adding or updating dependencies. Commit both `package.json` and `package-lock.json` after such a change. Peer-dependency conflicts are handled by the [installation and update procedure](../development/README.md#install-and-update-dependencies) instead of enabling a global npm override.

## Browsers for screenshots and e2e

Taking screenshots of the UI with `ai-team screenshots capture` and running the e2e tests both need a Chromium browser controlled by Playwright. Install it after `npm ci`:

```sh
npx --no-install playwright install chromium
```

- The step is needed for UI screenshots (`ai-team screenshots capture`) and for the e2e tests (`npm run test:e2e`).
- It installs Chromium only, together with its headless shell. The download is about 300 MB and happens once per machine: the browser goes into the Playwright browser cache, which is shared by all worktrees, so later runs and other worktrees reuse it.
- `--no-install` makes `npx` use the project's own `playwright` CLI from `@playwright/test` (`devDependencies`). The CLI itself is not downloaded from the network.

## E2E tests

The e2e tests run in Chromium against the production build. The DummyJSON API is stubbed inside the tests, so no network access to `dummyjson.com` is needed, but the build must still point at that host: the stub answers only `https://dummyjson.com`. Build first, in one command:

```sh
VITE_APP_API_URL=https://dummyjson.com npm run build
```

Then run the tests:

```sh
npm run test:e2e
```

- `playwright.config.ts` serves the built `dist` through `vite preview` on `127.0.0.1` (port `4173` by default, or `PORT`) and starts that server itself. It does not build the app, so rebuild after every change to the source.
- To run against a server that is already running, set `PLAYWRIGHT_BASE_URL` (for example `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npm run test:e2e`). If a server answers at that URL, it is reused and no second server is started; the server must serve the build made with the command above.
- To run only the smoke test, pass `--grep` after `--`. npm passes the flag to Playwright only with the separator:

  ```sh
  npm run test:e2e -- --grep @smoke
  ```

  Without `--`, npm consumes `--grep` itself and the test run does not get the filter.

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

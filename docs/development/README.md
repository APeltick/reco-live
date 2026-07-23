# Development and preview

## Start the development server

```sh
npm run dev
```

Vite serves the application with Hot Module Replacement. The server binds to `127.0.0.1`, so it is accessible only from the local machine. It deliberately fails if its configured port is unavailable instead of choosing a different one.

## Install and update dependencies

Use a clean, reproducible install for an existing checkout:

```sh
npm ci --legacy-peer-deps
```

When adding or updating a dependency, first run the ordinary install command. This lets npm report peer-dependency conflicts instead of silently accepting them:

```sh
npm install <package> --save-dev
```

If npm reports a conflict, identify the packages involved before deciding on a workaround:

```sh
npm explain <package-that-reports-the-conflict>
npm ls <package-that-reports-the-conflict>
```

Prefer upgrading the package, its peer dependency, or using a compatible alternative. Use `--legacy-peer-deps` only for an understood, documented exception after those options have been checked.

⚠️ The current exception `--legacy-peer-deps` and its removal criteria are documented in [issues doc - eslint-plugin-jsx-a11y and ESLint 10](../issues/README.md). And don't forget adding if new issue will appear. ⚠️

## Build for production

```sh
npm run build
```

The build first type-checks the project and then writes the production assets to `dist/`.

## Preview the production build

```sh
npm run preview
```

Run this after `npm run build` to serve the generated `dist/` files locally. The preview server follows the same local-only and strict-port policy as the development server.

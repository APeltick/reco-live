# Git hooks and peer-dependency policy

## Lefthook

This project uses [Lefthook](https://lefthook.dev/) to run Git hooks. It is installed as a development dependency, and the package's postinstall step installs the hooks after `npm install` or `npm ci`.

If a checkout does not have the hooks yet, install them manually:

```sh
npx --no-install lefthook install
```

Validate the configuration before changing it:

```sh
npx --no-install lefthook validate
```

The hook definitions live in [`lefthook.yml`](../../lefthook.yml).

### pre-commit flow

`pre-commit` is the lightweight local gate. It blocks a commit when:

- `npm run lint` finds an ESLint warning or error, or a Stylelint error.

Lefthook runs the lint job only when a JavaScript or TypeScript file is staged. Documentation-only commits therefore perform only the staged diff check.

The hook does not fix files or stage changes automatically. Correct the issue, review the diff, and stage the intended result explicitly.

### pre-push flow

`pre-push` is the complete release-quality gate. Its jobs run in parallel and a failure blocks the push:

- runs `npm ci --dry-run --ignore-scripts` to ensure `package-lock.json` reproduces the dependency tree;
- runs `npm run check` for TypeScript, ESLint, Stylelint, Vitest unit tests, and a Vite production build;
- runs `npm audit --omit=dev --audit-level=high` for high and critical vulnerabilities in production dependencies only. Dev dependencies are not checked by the hook; check them with plain `npm audit` and see the known issues in [`docs/issues/README.md`](../issues/README.md). This check requires access to the npm registry.

Unit tests run as part of `npm run check`, so this hook enforces them before every push.

## Peer-dependency policy

A new dependency must install with plain `npm ci` or `npm install`; the pre-push check enforces it. The full policy is in [Peer-dependency conflicts](../issues/README.md#peer-dependency-conflicts) and [Install and update dependencies](../development/README.md#install-and-update-dependencies).

See [known dependency issues](../issues/README.md) for open issues and their temporary resolutions.

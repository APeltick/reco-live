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

- runs `npm ci --dry-run --ignore-scripts --legacy-peer-deps` to ensure `package-lock.json` reproduces the dependency tree while the documented accessibility peer-dependency issue remains open;
- runs `npm run check` for TypeScript, ESLint, Stylelint, and a Vite production build;
- runs `npm audit --audit-level=high` for high and critical dependency vulnerabilities. This check requires access to the npm registry.

There are currently no automated tests in the project. Add them to `npm run check` and this hook will enforce them before every push.

## Peer-dependency policy

Do not enable `legacy-peer-deps` merely to make a new dependency install. First run the ordinary installation command and investigate the conflict:

```sh
npm install <package> --save-dev
npm explain <package-that-reports-the-conflict>
npm ls <package-that-reports-the-conflict>
```

Then check whether an update of the package, the peer package, or a compatible alternative removes the conflict. Prefer that real fix. Only when the affected package is necessary, the incompatibility is understood, and no compatible update or replacement exists may `legacy-peer-deps` be used temporarily. Record the exact package, versions, reason, and upstream tracking link in project documentation. Revisit the exception whenever dependencies are upgraded.

See [known dependency issues](../issues/README.md) for the current, explicitly scoped exception.

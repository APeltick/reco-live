## Context

`eslint.config.js` loads `eslint-plugin-jsx-a11y` 6.10.2 through `fixupPluginRules` (`@eslint/compat` 2.1.0), because the plugin still uses the pre-v9 ESLint API. The config is the plugin's `flatConfigs.strict` preset plus three rules at `error` (`anchor-ambiguous-text`, `no-aria-hidden-on-focusable`, `lang`) and settings `components` (`Button` → `button`, `Link` → `a`) and `polymorphicPropName: "component"` for MUI. No `eslint-disable` comment in `src/` names a `jsx-a11y/` rule today. The plugin's peer is `eslint ^3 … ^9`; the project is on `eslint` 10.6.0, so npm rejects the tree without `--legacy-peer-deps`. `.npmrc` has `save-exact=true` and must not get `legacy-peer-deps=true` (`docs/issues/README.md`).

## Goals / Non-Goals

Goals: plain `npm ci` / `npm install` succeed; the same accessibility rules run with the same severity and settings; peer validation is back for the rest of the tree.

Non-goals: new accessibility rules; changing other lint plugins; any `src/` change beyond renaming rule ids in comments if the fork needs it.

## Decisions

- **Order of resolutions** (the first that passes the checks below wins; the PR records each attempt with its command output):
  1. **The fork `eslint-plugin-jsx-a11y-x`** (es-tooling, latest 0.2.0, peer `eslint ^9 || ^10`) — a real declaration of ESLint 10 support, no compat shim needed. Taken only if it provides every rule of today's `strict` preset plus the three extra rules, honours `components` and `polymorphicPropName`, and reports the same findings on the current code (`npm run lint` output identical apart from the rule-id prefix). Rule ids change prefix (`jsx-a11y/…` → the fork's namespace); `eslint.config.js` and any comment follow.
  2. **A scoped npm `overrides`** for the plugin's peer: `"overrides": { "eslint-plugin-jsx-a11y": { "eslint": "$eslint" } }`, the plugin stays, `fixupPluginRules` stays. This keeps today's runtime exactly and limits the exception to one package instead of the whole tree; a comment in `docs/issues/README.md` explains it and when to drop it (upstream #1075).
  3. **ESLint 9** — rejected: a downgrade of the whole lint stack (ESLint 10 and its plugins, already on 10-only versions) to satisfy one plugin; more risk than the flag it removes.
- **Checks for a resolution:** on a clean worktree `npm ci` (no flag) succeeds and `npm ls --all` reports no `invalid` / `ERESOLVE`; `npm install -D <any small package> --dry-run` (no flag) succeeds; `npm run check` green; the accessibility lint still fires — mutations, each restored: an `<img>` without `alt` in a component → `npm run lint` red with the alt-text rule; `<a href="/x">here</a>` → red with `anchor-ambiguous-text`; a MUI `<Button component="a">` without `href` → red (polymorphic setting works).
- **"Not possible yet" is a valid outcome.** If 1 and 2 both fail, no package change ships; `docs/issues/README.md` records the attempts, the failure output and what to recheck (upstream #1075, the fork's next release); the flag stays, task 2.1 is dropped.
- **Team rules last.** The overlay `commands.install` and the CI workflows change only after the package change is on main: a gate or CI install with the flag still works on the fixed tree, the reverse does not.

## Risks / Trade-offs

- [Young fork] 0.2.0 has a short history; parity is proven by identical lint output and the mutations, not by trust. If later it lags, option 2 is the fallback.
- [Override hides a real break] `$eslint` forces the peer; if the plugin really breaks on ESLint 10, `npm run lint` fails (it runs today through the same compat shim), so the break would not be silent.
- [Lockfile churn] a normal regeneration may move other transitive versions; the PR lists `npm ls` differences of direct dependencies, and `npm audit` must not get worse.

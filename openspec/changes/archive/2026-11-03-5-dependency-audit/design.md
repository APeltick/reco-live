## Context

See proposal.md — Why. `npm run audit` is `npm audit --audit-level=high` and audits all dependencies, dev included, although the pre-push step is named "Audit production dependencies". `npm audit --omit=dev --audit-level=high` on the current lockfile reports one high issue — `react-router` — fixed in 8.5.0. The `stylelint` chain (`stylelint` → `globby`/`fast-glob`/`micromatch` → `braces`) is flagged because every published `braces` release (latest 3.0.3) is in the advisory range; `npm audit` suggests downgrading `stylelint` to 7.7.0, which would drop the project's lint setup.

## Goals / Non-Goals

**Goals:**
- No high vulnerabilities in production dependencies; pre-push passes without exclusions.
- Fix every dev advisory that has a fixed release.

**Non-Goals:**
- Downgrading or replacing `stylelint`.
- Adding an audit step to CI (CI workflows are rendered by AI kit from the project overlay — a team-rules change, decided separately).
- Removing `--legacy-peer-deps` (separate known issue).

## Decisions

- **Exact versions**, as in the rest of `package.json`: `react-router` 8.5.0, `vite` 8.3.5. Peer ranges allow it: `@vitejs/plugin-react` 6.0.3 needs `vite ^8.0.0`, `vite-tsconfig-paths` any.
- **Transitive fixes** — `npm audit fix --legacy-peer-deps` without `--force` (lockfile only, no semver-major jumps).
- **Audit scope — production only** (`npm audit --omit=dev --audit-level=high`). Alternatives: keep auditing dev and add an ignore tool (`audit-ci`, `better-npm-audit`) — a new dependency only to silence one advisory with no fix; `npm overrides` for `braces` — no fixed version to override to; downgrade `stylelint` — loses lint. The production bundle is what users get; dev advisories are still visible via plain `npm audit` and recorded in known issues.
- **Known issue entry** for `braces` GHSA-vfj7-8cjw-p6xm in `docs/issues/README.md` by its template: dev-only (lint tooling), DoS via deeply nested glob patterns that only the project's own config supplies; removal — when a fixed `braces` (or `micromatch`/`stylelint` without it) is released, restore full `npm audit` if the team wants it.

## Risks / Trade-offs

- [`react-router` 8.2 → 8.5 changes routing behavior] → check `/`, `/product`, `/nope` and the 404 "Go to home" link on the preview server; typecheck and build.
- [`vite` 8.3 changes build output] → `npm run build` and preview smoke of the same routes.
- [Dev-only advisories no longer fail pre-push] → plain `npm audit` still lists them; known issue entry tracks the one without a fix.

## Open Questions

- Add `npm audit --omit=dev --audit-level=high` to CI? Needs an overlay/CI change (team rules) — operator decides; not part of this change.

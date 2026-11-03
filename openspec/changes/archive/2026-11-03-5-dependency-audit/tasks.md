## 1. Dependencies

- [x] 1.1 [standard] Upgrade `react-router` to 8.5.0 and `vite` to 8.3.5 (exact versions) and run `npm audit fix --legacy-peer-deps` without `--force` for transitive fixes. Verify: `npm ci --legacy-peer-deps`, `npm run check` pass; on the preview server `/`, `/product`, `/nope` and the "Go to home" link work as before.
- [x] 1.2 [light] Change the `audit` script in `package.json` to `npm audit --omit=dev --audit-level=high`. Verify: `npm run audit` exits 0 and a plain `git push` passes the pre-push hook without `LEFTHOOK_EXCLUDE`.

## 2. Docs

- [x] 2.1 [light] Add a known issue to `docs/issues/README.md` by its template for `braces` GHSA-vfj7-8cjw-p6xm (dev-only, via `stylelint`; no fixed release): impact, why audit is production-only, tracking links, removal plan. Verify: every template section is filled, links present.

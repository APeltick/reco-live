## 1. Dependencies

- [x] 1.1 [light] Upgrade `zod` to 4.6.7 (exact version) in `package.json` and update `package-lock.json` (`npm install zod@4.6.7 --save-exact --legacy-peer-deps`). Verify: `npm ci --legacy-peer-deps`, `npm run check` pass; `npm run audit` exits 0; a plain `git push` passes the pre-push hook without `LEFTHOOK_EXCLUDE`; on the preview server `/` shows the product list as before (no validation errors in the console).

## 1. Playwright

- [ ] 1.1 [light] Add `@playwright/test` 1.64.1 (exact) to `devDependencies` with `npm install --save-dev --save-exact @playwright/test@1.64.1 --legacy-peer-deps`; commit `package.json` and `package-lock.json`. Verify: `npm ci --legacy-peer-deps` passes, `node_modules/.bin/playwright --version` prints 1.64.1, `npm run check` passes.
- [ ] 1.2 [light] Add a "Browsers for screenshots" step to `docs/installation/README.md`: `npx playwright install chromium`, when it is needed (screenshots of the UI) and that it downloads the browser once per machine. Verify: following the doc on a clean worktree, `ai-team screenshots capture` on the preview server for `/` and `/nope` produces both images.

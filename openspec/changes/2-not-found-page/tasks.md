## 1. Route constants

- [ ] 1.1 [light] Move `ROUTES_CONSTANTS` from `src/app/router/routes.constants.ts` to `src/shared/config/routes/` (`routes.constants.ts` + `index.ts`), import it in the router from `~shared/config/routes`, remove the old file; paths unchanged. Verify: `npm run typecheck`, `npm run lint` and `npm run build` pass; `/` and `/product` open as before.

## 2. Not-found page

- [ ] 2.1 [standard] Rebuild `NotFoundPage` in `src/pages/not-found/` per `specs/not-found-page`: MUI, centered, `h1` "Page not found", the explanation sentence, "Go to home" link to `ROUTES_CONSTANTS.dashboard` via the router link. Verify: `npm run typecheck`, `npm run lint`, `npm run build` pass; on the preview server `/nope` shows the page (screenshot in the PR), clicking "Go to home" and Tab + Enter on it open `/` without a full reload.

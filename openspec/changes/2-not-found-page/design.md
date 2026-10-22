## Context

`ROUTES_CONSTANTS` lives in `src/app/router/routes.constants.ts`. The project follows a layered structure (`app` → `pages` → `features` → `shared`, path aliases `~app`, `~pages`, `~features`, `~shared`): lower layers do not import higher ones. The not-found page (`src/pages/not-found`) needs the dashboard path, and importing it from `~app/router` would make `pages` depend on `app` — and `app/router` already imports the page, which would create an import cycle.

The page is rendered by `AppErrorBoundary` (root route `ErrorBoundary`) when the catch-all route throws a 404 `Response`, so it renders without `MainLayout`.

## Goals / Non-Goals

**Goals:**
- Route constants available to any layer from `shared`.
- 404 page built from MUI components, consistent with the theme.

**Non-Goals:**
- Changing route paths, the catch-all route or the error boundary logic.
- Handling other error statuses (500 etc.) — the error boundary keeps rendering nothing for them, as today.
- Introducing a test runner (the project has no unit or e2e setup yet).

## Decisions

- **Constants go to `src/shared/config/routes`** (`routes.constants.ts` + `index.ts` barrel, imported as `~shared/config/routes`). Alternative — keep them in `app` and pass the path to the page as a prop from the error boundary: rejected, every future page with links would need the same plumbing. Alternative — re-export from `app/router` for compatibility: not needed, the router is the only consumer.
- **Link is the router's link rendered through MUI** (`@mui/material/Link` with `component` set to the router `Link`, `to={ROUTES_CONSTANTS.dashboard}`): gives a real `<a href="/">` (keyboard, open in new tab) and client-side navigation. A `Button` with `navigate()` was rejected: not a link semantically, no "open in new tab".
- **Layout**: a full-viewport centered `Stack` (same height approach as `MainLayout`: `100svh`), heading as `Typography` with `component="h1"`, explanation as body text. Imports follow the lint rule: second-level MUI paths only (`@mui/material/Stack`).

## Risks / Trade-offs

- [No automated tests cover the page] → Proof by screenshot of `/nope` on the preview server and a manual click-through to `/`, recorded in the PR `Proof:`; e2e can be added when the project gets an e2e setup.

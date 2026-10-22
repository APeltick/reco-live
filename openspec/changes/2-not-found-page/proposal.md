## Why

Any unknown URL currently renders a bare `Page Not Found` text with no way back. Users who follow a broken or mistyped link get stuck and have to edit the address bar by hand (issue #2).

## What Changes

- The 404 page gets a proper layout: a heading, a short explanation and a "Go to home" link to the dashboard route (`ROUTES_CONSTANTS.dashboard`).
- Texts are in English, the same language as the rest of the UI.
- The page stays outside the main layout (it is rendered by the root error boundary); it is styled with MUI and centered on the screen.
- `ROUTES_CONSTANTS` moves from `src/app/router/routes.constants.ts` to `src/shared/config/routes`, so a page can link to a route without importing the `app` layer; the router imports the constants from the new place. Route paths do not change.

## Capabilities

### New Capabilities

- `not-found-page`: what a user sees when opening a URL that matches no route, and how they get back to the app.

### Modified Capabilities

— none (no existing specs in `openspec/specs/`).

## Impact

- `src/pages/not-found/` — the page itself.
- `src/app/router/` — import of route constants; `routes.constants.ts` removed there.
- `src/shared/config/routes/` — new home of `ROUTES_CONSTANTS`.
- No new dependencies, no API or data changes. No risky paths touched.

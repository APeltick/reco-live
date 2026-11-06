## Why

Any route error other than 404 (a 5xx response from a loader, an exception while rendering, a failed lazy chunk) currently renders an empty fragment: the user sees a blank screen with no message and no way back (issue #25). Separately, the browser tab, bookmarks and history call the app `draft` — a leftover of the project template (issue #26). Both are taken in one pass on the operator's word (OI-526).

## What Changes

- **#25** — one shared error page for every route error except 404 (404 keeps showing the not-found page, unchanged). It looks like the not-found page: centered, outside the main layout, texts in English:
  - heading `Something went wrong`;
  - one sentence: `An unexpected error occurred. Please try again or go back to the home page.`;
  - a `Try again` button that reloads the current page (a full reload);
  - a `Go to home` link to the dashboard route (`/`), as on the not-found page.
  The error itself is written to the browser console (`console.error`) for developers; the user sees neither an error code nor the error text. No separate page for 5xx.
- **#26** — the document title in `index.html` becomes `Reco Live`; the package name in `package.json` and `package-lock.json` becomes `reco-live`. No per-page titles.

### Decisions made in this change (open points of the analysis)

- **Explanation sentence** — the text above: says what happened and names both ways out.
- **New capability `route-error-page`**, not a requirement inside `not-found-page`: that spec is about URLs that match no route; the error page is a different situation with its own content. `not-found-page` is not modified.
- **`Try again` = full page reload** (`window.location.reload()`), not repeating the navigation: a reload also recovers from a failed lazy chunk, an error thrown while rendering, and a broken app state — the cases where re-running the same navigation in the same app state would fail again.

## Capabilities

### New Capabilities

- `route-error-page`: what the user sees when a route fails with anything other than 404, and how they recover.
- `document-title`: the name of the app in the browser tab.

### Modified Capabilities

— none (`not-found-page` is unchanged: 404 behaves as before).

## Impact

- `src/pages/error/` — new error page.
- `src/app/error-handling/app-error-handling.tsx` — shows the error page for non-404 errors and logs the error.
- `index.html` — `<title>`.
- `package.json`, `package-lock.json` — the `name` field only (risky path: full review); no dependency changes.
- No new dependencies, no API or data changes.

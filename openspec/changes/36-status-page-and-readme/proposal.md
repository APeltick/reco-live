## Why

**#36.** The route error page (`ErrorPage`) and the not-found page (`NotFoundPage`) repeat the same markup and styles: a centered MUI `Stack` that fills the screen (`100svh`), an `h1` heading, a secondary sentence and the ways out (issue #36). Any change of the look has to be made twice and the two pages can drift apart. On the operator's word (OI-691, option "б") the whole service page becomes one shared component.

## What Changes

- **#36** — a new shared component `StatusPage` in `src/shared/ui/status-page/` that renders the whole service page:
  - the layout of today's pages: a MUI `Stack` with `spacing={2}`, centered on both axes, `height: 100svh`, `maxHeight: 100%`, `padding: 3`, `textAlign: center`, background `background.default`;
  - `title` — the top-level heading (`Typography component="h1" variant="h4"`);
  - `description` — one sentence in the secondary text color (`Typography color="text.secondary"`);
  - `children` — the actions slot, rendered after the description in the given order.
  `ErrorPage` and `NotFoundPage` are rewritten on top of it, passing their own texts and actions (`Try again` button + `Go to home` link; `Go to home` link). What the user sees and how the pages behave does not change: the same texts, the same order of elements, the same keyboard order, the same links and reload.
- **#33** — `README.md` stops calling the project `Draft frontend template` (a leftover of the project template). On the operator's word (OI-694, option "а"):
  - the heading becomes `# Reco Live`;
  - the intro line becomes `Reco Live — React single-page application.` — neutral, without the product domain (it is added after issue #22);
  - the other sections (`Stack`, `Quick start`, `Project conventions`, `Documentation`) are not touched.

### Decisions made in this change

- **Name `StatusPage`, layer `shared/ui`** — the component knows nothing about routes or errors (texts and actions come from the page), so it belongs to `shared`, next to `ContainerLoader`; the pages stay in `src/pages/`.
- **Actions as `children`**, not a typed list of buttons/links: the two pages have different actions (a button that reloads, a router link), and the slot keeps the component free of routing and of `window`.

## Capabilities

### New Capabilities

— none

### Modified Capabilities

— none. Refactoring and README only: `not-found-page` and `route-error-page` stay as they are (`skip_specs: true`).

## Impact

- `src/shared/ui/status-page/` — new (`status-page.tsx` + `index.ts`).
- `src/pages/error/error-page.tsx`, `src/pages/not-found/not-found-page.tsx` — use `StatusPage`.
- `README.md` — the heading and the intro line only (docs only).
- No new dependencies, no API or data changes, no risky paths.

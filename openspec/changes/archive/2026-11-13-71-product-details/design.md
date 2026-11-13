## Context

See proposal.md. These are the facts as checked on 2026-11-13:

- DummyJSON `GET /products/1` returns `200` and one product in the same shape as an item of the list, so `ProductSchema` fits.
- `GET /products/9999` and `GET /products/abc` return `404 {"message":"Product with id '…' not found"}`.
- `request()` throws `RequestError` on a non-2xx response, with `response` set, and reports it as kind `http`. It skips both the throw and the report for statuses listed in `allowedStatusCodes`. A fetch that never got a response also throws `RequestError`, with no `response`. An abort is rethrown as is.
- The router (`src/app/router/router.tsx`) is a data router (`createBrowserRouter`, react-router 8.5.0). Its root `AppErrorBoundary` renders the not-found page for a 404 route response and the error page for anything else.
- A data router does not render a route element until that route's `loader` resolves. That has three consequences:
  - On a direct open, it renders the route's `HydrateFallback`; there is none in `src/` today.
  - On in-app navigation, the previous page stays on screen. Nothing in `src/` uses `useNavigation` today.
  - The `Suspense` fallback of `/product` shows only while a lazy chunk loads.
- `ContainerLoader` is `position: absolute; inset: 0`, and `MainLayout` (a row `Stack`, `100svh`) has no `position: relative`.
- Route errors render without the main layout (specs `not-found-page`, `route-error-page`).
- The catalog route is `/product`, singular. The operator named the details route `/products/:id`, so both are used as said.

## Goals / Non-Goals

**Goals:** a details page with photo, title, price and description; links to it from the catalog; a back link that keeps the catalog state; 404 through the existing not-found page; a loading indicator on every load, including the first, and an error state; the loading decision rule under unit tests.

**Non-Goals:**
- a separate network-error message (change `73-network-error-retry`);
- a gallery of all images, reviews, rating, stock, discount or add-to-cart;
- per-page document titles (spec `document-title` keeps `Reco Live` on every page);
- moving or renaming `/product`;
- e2e tests (the project has no e2e yet: overlay `commands.e2e` is `—`).

## Decisions

- **`getProductById(id, signal): Promise<Product | null>`.** It calls `request()` with `allowedStatusCodes: [404]`.
  - A `404` returns `null`. It is not thrown and not reported, because an unknown id is an expected answer, not an incident.
  - A `200` is parsed with `ProductSchema`; a wrong shape throws `RequestError`, as `requestParsed` does in `get-products.ts`.
  - Every other failure throws as `request()` does today.
- **The decision rule is a pure function under unit tests.** `resolveProductDetails(idParam, getById, signal)` in `src/features/products/model/` returns one of three results: `{ kind: "not-found" }`, `{ kind: "product", product }` or `{ kind: "error", error }`.
  - An `idParam` that `parseProductId` rejects gives `not-found`, and `getById` is not called.
  - `getById` returning `null` gives `not-found`.
  - A product gives `product`.
  - A thrown `RequestError` gives `error`.
  - Anything else thrown is rethrown, including an abort (the router ignores it) and a programming error (it reaches the route error page, per spec `route-error-page`).

  It is exported through the feature index (ADR-0001 layers). `getById` is injected, so the tests need no `fetch` stub for the rule.
- **The route loader is thin.** The `/products/:id` loader calls `resolveProductDetails(params.id, getProductById, request.signal)`. It throws `new Response("Not found", { status: 404 })` for `not-found`, and returns the result otherwise.
  - `AppErrorBoundary` shows the unchanged not-found page for the 404.
  - An `error` result stays inside the layout, so the page can offer `Try again` (`useRevalidator().revalidate()`) without the full-screen error page, whose `Try again` reloads the whole app.
- **The loading indicator on every load:**
  - Direct open: the `/products/:id` route gets `HydrateFallback: ContainerLoader`, so a direct open shows the loader instead of a blank screen while the loader runs.
  - In-app navigation (a click from the catalog, or `Back to products`): `MainLayout` shows an MUI `LinearProgress` at the top while `useNavigation().state === "loading"`. That way the user sees the product is loading while the catalog is still on screen. It is generic, so `/product` gets it on navigation too, harmlessly.
  - Retry: the details page shows `ContainerLoader` while `useRevalidator().state === "loading"`.
  - `MainLayout` gets `position: relative`, so `ContainerLoader` centers inside the layout, not against the viewport by accident. The 2.1 screenshots show where it lands.

  The executor may load the page module through the route's `lazy` together with the loader, and names the choice in the PR.
- **The data comes from the API, not from the Redux slice.** The slice holds the last catalog collection only. A direct open of `/products/12` must work with an empty store, so the page always loads by id. There is no cache.
- **Content:**
  - the image is `images[0]`, falling back to `thumbnail`, with `alt` set to the product title;
  - the title is a level-1 heading;
  - the price is `Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })`, so `9.99` becomes `$9.99` (DummyJSON prices are in USD);
  - the description is plain text.

  MUI components, English texts. The fixed texts are `Back to products`, `Could not load the product.` and `Try again`.
- **The back link keeps the catalog state through link state.** A catalog title is a router `Link` to `/products/<id>` with `state: { from: "<catalog search>" }`, where the catalog search is the current `location.search` of `/product` (for example `?category=laptops`; a later page parameter is carried the same way).
  - The details page renders `Back to products` as a regular link to `/product` plus `from`, when `from` is a string that is empty or starts with `?`. Anything else falls back to `/product`.
  - The link is a regular link, not `navigate(-1)`. It works when the page is opened directly or in a new tab: there it leads to `/product`.
  - It also works when the user moved between products.
  - The builder is a pure function in `src/features/products/model/` with unit tests.
- **Route id parsing** is a pure function: digits only, no leading zero, at least 1, and at most `Number.MAX_SAFE_INTEGER`. So `"12"` gives 12, while `"0"`, `"01"`, `"-1"`, `"+1"`, `" 1"`, `"1.5"`, `"abc"`, `"12abc"`, `""` and `"99999999999999999999"` give `null`.
- **The catalog titles in specs.** The requirement "Catalog titles open the product page" lives in `product-details`, so this change does not depend on the archive order of `22-dummyjson-catalog`. The `product-catalog` spec says titles are shown, not that they are plain text, so the two do not contradict. When both are archived, nothing needs restating.
- **Tests:**
  - unit: `getProductById` with a stubbed `fetch` (`200` → product; `404` → `null`, with no error report; `500` → `RequestError`; wrong shape → `RequestError`);
  - unit: `resolveProductDetails` with a fake `getById` (`"abc"` → `not-found` and `getById` not called; `null` → `not-found`; product → `product`; a `RequestError` for a 500, a network failure or a wrong shape → `error`, not thrown; a plain `Error` → rethrown);
  - unit: `parseProductId` and the back-link builder;
  - the page and the pending indicators are proven in the PR with screenshots against DummyJSON.

## Risks / Trade-offs

- [Live third-party API in screenshots: images and texts may change] The PR records the date of the run. Unit tests use a fixture.
- [A global navigation indicator in `MainLayout` is a new piece of the app shell] It is small, generic and needed for any loader-based route. It does not change `/product`'s own loader, which shows on its query changes.
- [The first-load indicator is hard to catch on a fast network] Prove it in the PR with a throttled or delayed response (the screenshot tool's request interception, or DevTools throttling).
- [Link state is lost on a new tab or a shared link] The back link then leads to `/product`. That is acceptable: the filters live in the catalog URL.

## Context

See proposal.md. These are the facts as checked on 2026-11-13:

- DummyJSON `GET /products/1` returns `200` and one product in the same shape as an item of the list, so `ProductSchema` fits.
- `GET /products/9999` and `GET /products/abc` return `404 {"message":"Product with id '…' not found"}`.
- `request()` throws `RequestError` on a non-2xx response, with `response` set. A fetch that never got a response also throws `RequestError`, with no `response`.
- The router (`src/app/router/router.tsx`) is a data router (`createBrowserRouter`). Its root `AppErrorBoundary` renders the not-found page for a 404 route response and the error page for anything else.
- Route errors render without the main layout (specs `not-found-page`, `route-error-page`).
- The catalog route is `/product`, singular. The operator named the details route `/products/:id`, so both are used as said.

## Goals / Non-Goals

**Goals:** a details page with photo, title, price and description; links to it from the catalog; a back link that keeps the catalog state; 404 through the existing not-found page; loading and error states.

**Non-Goals:**
- a separate network-error message (change `73-network-error-retry`);
- a gallery of all images, reviews, rating, stock, discount or add-to-cart;
- per-page document titles (spec `document-title` keeps `Reco Live` on every page);
- moving or renaming `/product`;
- e2e tests (the project has no e2e yet: overlay `commands.e2e` is `—`).

## Decisions

- **The route loader decides "not found"; the page handles everything else.** The `/products/:id` route gets a `loader`:
  - an `id` that is not a positive integer throws `new Response("Not found", { status: 404 })` and makes no request;
  - otherwise it calls `getProductById(id, request.signal)`;
  - a `RequestError` whose `response.status` is `404` is rethrown as the same 404 route response, so the existing `AppErrorBoundary` shows the not-found page, which stays unchanged;
  - any other failure is **returned** as an error result, not thrown, so the page stays inside the layout and can offer `Try again`. A thrown non-404 error would show the full-screen error page, whose `Try again` reloads the whole app.

  `Try again` calls `useRevalidator().revalidate()`. Loading shows the existing `ContainerLoader`, both while the lazy page loads (as `/product` does) and during revalidation.

  This keeps 404 a route-level fact (right status, right page) and network or server trouble a page-level fact. The executor may use the route's `lazy` to load the page module and the loader together, and names the choice in the PR.
- **The data comes from the API, not from the Redux slice.** The slice holds the last catalog collection only. A direct open of `/products/12` must work with an empty store, so the page always loads by id. There is no cache.
- **Content:**
  - the image is `images[0]`, falling back to `thumbnail`, with `alt` set to the product title;
  - the title is a level-1 heading;
  - the price is `Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })`, so `9.99` becomes `$9.99` (DummyJSON prices are in USD);
  - the description is plain text.

  MUI components, English texts. The fixed texts are `Back to products`, `Could not load the product.` and `Try again`.
- **The back link keeps the catalog state through link state.** A catalog title is a router `Link` to `/products/<id>` with `state: { from: "<catalog search>" }`, where the catalog search is the current `location.search` of `/product` (for example `?category=laptops`, or `?q=phone`; a later page parameter is carried the same way).
  - The details page renders `Back to products` as a regular link to `/product` plus `from`, when `from` is a string that starts with `?` or is empty. Anything else falls back to `/product`.
  - The link is a regular link, not `navigate(-1)`. It works the same when the page is opened directly or in a new tab: there it leads to `/product`.
  - It also works when the user moved between products, so history Back is not assumed.
  - The building and checking of `from` is a pure function in `src/features/products/model/` with unit tests, exported through the feature index (ADR-0001 layers).
- **Route id parsing** is a pure function too: `parseProductId("12") → 12`, and `"0"`, `"-1"`, `"1.5"`, `"abc"` and `"12abc"` all give `null`.
- **Tests:**
  - unit: `getProductById` with a stubbed `fetch` (valid → product; `404` → `RequestError` with status 404; wrong shape → `RequestError`), `parseProductId`, and the back-link builder;
  - the page itself is proven in the PR with screenshots against DummyJSON (content, back link with a category, direct open, unknown id → not-found page, error with `Try again` with the API pointed to an unreachable host).

## Risks / Trade-offs

- [Live third-party API in screenshots: images and texts may change] The PR records the date of the run. Unit tests use a fixture.
- [The loader returning an error instead of throwing it is unusual] It is the only way to keep the in-layout `Try again` without the full-screen error page. The rule is written here and in the spec, and 73 builds on it.
- [Link state is lost on a new tab or a shared link] The back link then leads to `/product`. That is acceptable: the filters live in the catalog URL, and a shared link has no "came from".

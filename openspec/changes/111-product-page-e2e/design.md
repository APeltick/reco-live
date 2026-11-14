## Context

Change 82 gave `tests/e2e/fixtures/test.ts` (a `test.extend` with an automatic `dummyJson` fixture: `requests`, `violations`, `hold(match) → { arrived, release, outcome }`, an origin guard) and `mockDummyJson(page, overrides?)` with `overrides.product` (the stub answers `/products/<id>` only for the id of `fixtures.product`). The product page: route `/products/:id` with `HydrateFallback: ContainerLoader` and a loader (`src/app/router/router.tsx:30-43`) that calls `resolveProductDetails` and throws a `404` response for not-found; the page (`src/pages/product-details/product-details-page.tsx`) shows `ContainerLoader` while the revalidator loads, the `Back to products` link from `location.state.from`, the `ErrorAlert` with `Try again` → `revalidator.revalidate()`, and the content. The layout shows a loader while a navigation loads (`src/app/layouts/main-layout/main-layout.tsx:19`).

## Goals / Non-Goals

Goals: browser proof of the `product-details` wiring; a stub that can fail a request in each way the spec names.

Non-goals: product behaviour; the helpers already proven by units (`product-back-link.test.ts`, `product-view.test.ts`, `resolve-product-details.test.ts`); the not-found page's own content (spec `not-found-page`); other browsers.

## Decisions

- **Failing a request in the stub.** `handle.fail(match, failure)` — `match` as in `hold` (a `path + search` string or a predicate); `failure` is `{ status: number }` (answered with that status and an empty JSON body), `"shape"` (`200` with `{ "unexpected": true }`) or `"network"` (`route.abort("internetdisconnected")`). A failure is checked before the stub's routing (any DummyJSON path can fail, with or without a fixture). Only the **first** matching request fails; later ones get the normal answer (so a retry can succeed). Failed requests are logged in `requests` and are not violations. `fail` and `hold` may target the same path: `fail` applies to the first match, `hold` to the first match not taken by `fail` — the retry test fails the first request and holds the second.
- **Product without images.** `overrides.product` with `images: []` and a distinct `thumbnail` URL on the CDN host (the stub answers the CDN with one SVG) — no new fixture file.
- **Other product ids.** Back to a filtered catalog opens a laptop from `/product?category=laptops`: the test passes `overrides.product` with that laptop's id and title, so the stub answers its `/products/<id>`.
- **One spec file, scenario per test.** `tests/e2e/product-details.spec.ts`, each test with its own `page.goto`, steps by `test.step`, role/label locators (`getByRole("heading", { level: 1 })`, `getByRole("img", { name })`, `getByRole("link", { name: "Back to products" })`, `getByRole("alert")`, `getByRole("button", { name: "Try again" })`, `getByRole("progressbar")`), no `waitForTimeout`; loading is proven with `hold` (the indicator is asserted while the response is parked, then `release()`).
- **No reload on retry.** Before `Try again` the test sets a marker on `window`; after the content appears the marker is still there.
- **Not-found without a request.** For `/products/abc` the test asserts that `requests` has no `/products/abc` (and no `/products/` product request at all).
- **Why e2e and not lower.** The helpers are unit-tested; what breaks unnoticed is the wiring between router, loader, link state, revalidator and layout. Each test names its mutation in `tasks.md` that must turn it red.
- **e2e-map (team rules).** After the tests are on main: `src/pages/product-details/**` → `tests/e2e/product-details.spec.ts`; `src/features/products/**` and `tests/e2e/fixtures/**` also include it (in the format the overlay supports — checked with `ai-team gate --plan`).

## Risks / Trade-offs

- [Abort reason] `route.abort("internetdisconnected")` must be classified by the app as "no response" (`No connection …` text); if the app's `RequestError` mapping does not see it that way, the test reports it rather than changing the app.
- [Loader timing] The direct-open indicator is the `HydrateFallback`; the in-app one is the layout's navigation loader; with a parked response both are stable, no timing involved.

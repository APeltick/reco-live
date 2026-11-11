## Context

See proposal.md. The products feature (`src/features/products`) was written for json-server: `ProductsCollectionSchema` with `data`/`pages`, `GetProductsParams` with `_page`/`_per_page`, slice selectors read `collection.data`. DummyJSON (checked 2026-11-11):

- `GET /products?limit=&skip=`, `GET /products/search?q=&limit=&skip=`, `GET /products/category/<slug>?limit=&skip=` → `{ products: Product[], total, skip, limit }`, `id` numeric; an unknown slug → `200 { products: [], total: 0, skip: 0, limit: 0 }`.
- `GET /products/categories` → `[{ slug, name, url }]`.
- Search and category cannot be combined in one request (hence OI-1001).

## Goals / Non-Goals

**Goals:** the list works against DummyJSON; search, category, URL state, messages, accessibility as in the spec; unit tests of the parsing and URL building.

**Non-Goals:** pagination UI (OI-1003); a local mock or json-server (OI-999); a product details page; sorting; moving the list to `/` (see Decisions).

## Decisions

- **The list stays on `/product`.** Issue #49 says "На главной список товаров", but the list is on `/product` today and `/` is a placeholder home page; moving routes is not asked for. Search and filter go where the list is. (Obvious by plan, OI-1003 «не жди меня там, где решение очевидно по плану»; the human sees it at the change approval.)
- **One schema for all three list endpoints**: `ProductsCollectionSchema = { products, total, skip, limit }`; `ProductSchema.id` → `z.number()`; the rest of `ProductSchema` unchanged (dates and nested objects already pass on DummyJSON). New `CategorySchema = { slug, name, url }`, `CategoriesSchema = z.array(CategorySchema)`.
- **Query model**: `ProductsQuery = { kind: "all" } | { kind: "search", q } | { kind: "category", slug }` — the type makes "both at once" impossible. One `getProducts(query, { limit, skip }, signal)` builds the URL by kind (`/products`, `/products/search?q=`, `/products/category/<encodeURIComponent(slug)>`); `limit=10`, `skip=0` constant for now. `getCategories(signal)` separately.
- **URL is the source of truth**: the page reads `q` / `category` with `useSearchParams` (react-router 8), derives the `ProductsQuery`, and writes changes with `setSearchParams` (push, so Back works). The search input keeps a local text state, synced from `q` whenever the URL changes (link, Back), so the field never drifts from the URL; a ~300 ms debounce writes `q` (and removes `category` at that moment); choosing a category writes `category` and removes `q` at once (and clears the local text). The URL↔query rules (parse params → `ProductsQuery`, both → category, whitespace → `all`; query → params) are pure functions in `src/features/products/model/`, exported through the feature index (ADR-0001 layers). Opening with both — `category` wins, `q` is removed with `replace` (no extra history entry).
- **Latest request wins**: requests are made with an `AbortController` per query; a new query aborts the previous one (`request()` already rethrows aborts without reporting), and the fetch function checks `signal.aborted` before `dispatch(productsReceived(...))` (today the dispatch runs inside the fetch function, `use-fetch-products.ts`, not behind `useFetch`'s `isActive`), so a stale response never lands. The existing `useFetch` re-runs on a new fetch function; the abort is added through its effect cleanup or a small dedicated hook — executor's choice, named in the PR. An abort during the body read surfaces from `parseJson` as `RequestError` — swallowed with the stale request, never shown.
- **Redux slice**: keeps the last collection as today (`collection.products`); selectors renamed to the new shape. Categories are local to the filter component (no slice) — they are used in one place.
- **UI**: MUI `TextField` (label `Search products`, `type="search"`), MUI `TextField select` / `Select` with `InputLabel` (label `Category`), `Typography` with `aria-live="polite"` for `N products found` / `No products found`, `Alert severity="error"` with a `Try again` `Button` calling `refetch`, a loader on every load — while `isFetching` (not `isLoading`: in `src/shared/lib/hooks/use-fetch.ts` `isLoading` is true only before the first load) — the existing `ContainerLoader` or MUI `CircularProgress`; the error alert text is fixed `Could not load products.` (the raw `error.message`, e.g. `Request failed with status 500.`, is not shown to users). English texts as in the rest of the UI.
- **Docs**: `docs/installation/README.md` names `VITE_APP_API_URL=https://dummyjson.com` (the value to put in the local env file; no secrets) — task 1.1.
- **Tests**: unit (Vitest, from change `7-dev-tooling`): schemas accept a DummyJSON fixture (a trimmed real response, numeric `id`) and reject the json-server shape and a string `id`; the URL builder for all three kinds (encoding of `q` and `slug`, `limit`/`skip`); `getProducts` with a stubbed `fetch` — valid → data, wrong shape → `RequestError`. The URL↔state rules (both params → category wins; search clears category) are pure functions with unit tests; the debounce, if extracted as a small helper, gets a fake-timer unit test. Browser behavior (debounce, Back, keyboard, latest wins) — proven in the PR with screenshots and a manual run against DummyJSON; spec/05 puts history and keyboard in e2e, but the project has no e2e yet (overlay `commands.e2e` is `—`; change `7-dev-tooling` brings only the screenshot tool) — a follow-up issue for e2e of the catalog once Playwright e2e exists (lead proposes it via manager).

## Risks / Trade-offs

- [Live third-party API in manual checks and screenshots: downtime or data changes] → tests use fixtures; screenshots mask nothing data-dependent beyond titles; the PR records the date of the run.
- [Debounce plus abort adds async edge cases] → the "latest wins" rule is in the spec; the abort is the mechanism, the PR shows the rapid-typing case in the network log.
- [Section 3 needs Vitest] → section 3 starts after change `7-dev-tooling` task 3.1 is merged (or stacks on it); sections 1–2 do not wait.

## Why

The product list is empty: `ProductsCollectionSchema` expects json-server pagination (`data`, `first`, `items`, `last`, `next`, `pages`, `prev`) and a string `id`, while the public DummyJSON API returns `products`, `total`, `skip`, `limit` and a numeric `id` — every response fails validation (issue #22, smoke of PR #21: with `id` as a string 194/194 products pass; dates pass 970/970). Users also cannot find a product: there is no search and no category filter (issue #49).

Operator decisions:
- «Да, берём DummyJSON (настоящий публичный API, без своего мока).» (OI-999)
- Search and category are mutually exclusive: choosing a category clears the search and vice versa, only one in the URL (OI-1001, option «а»).
- First 10 products and the total found, no pagination now (OI-1003, option «а»).
- Executors take #22 and #49 (OI-987).

## What Changes

- **API shape (#22):** the product schema follows DummyJSON: collection `{ products, total, skip, limit }`, `id` is a number. The request uses DummyJSON paging (`limit`, `skip`) instead of `_page` / `_per_page`. The page shows the first 10 products and `N products found`.
- **Search (#49):** a labelled search field; after the user stops typing for ~300 ms the list is loaded from `/products/search?q=<text>`. An empty field returns to the full list.
- **Category filter (#49):** a labelled category select filled from `/products/categories`; a chosen category loads `/products/category/<slug>`. "All categories" returns to the full list.
- **Mutually exclusive:** choosing a category clears the search; typing a search clears the category.
- **URL state (#49):** `?q=<text>` or `?category=<slug>` (never both); opening such a link shows the same result; going back in the browser restores the previous state.
- **Messages (#49):** loading, empty result and request error each have a clear message (MUI); the error offers "Try again".
- **Unit tests** of the schema and URL builders against DummyJSON-shaped fixtures (moved here from #48: written once, against the new shape). Needs Vitest from change `7-dev-tooling`.

## Capabilities

### New Capabilities

- `product-catalog`: the product list on `/product` — source API, what is shown, search, category filter, URL state, messages.

### Modified Capabilities

— none.

## Impact

- `src/features/products/model/product.schemas.ts`, `product.types.ts`, `product-slice.ts`, `use-fetch-products.ts`, `src/features/products/api/get-products.ts`, `product-api.constants.ts`; new API calls for search and categories; `src/pages/product/product-page.tsx` and new UI components under `src/features/products/ui/` (or the page). `src/shared/api/**` and `src/app/store/**` are risky paths (full review) — changed only if needed.
- The app needs `VITE_APP_API_URL=https://dummyjson.com` (already the value the issue was checked with); docs name it if they do not yet.
- Network: the live DummyJSON API — tests do not call it (fixtures, stubbed `fetch`); only manual smoke and screenshots do.

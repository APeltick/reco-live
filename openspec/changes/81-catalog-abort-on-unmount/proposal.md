## Why

The verify of change `22-dummyjson-catalog` (reviewer-1, WARNING 1) found that "Latest request wins" holds only inside one mounted catalog page (issue #81). `useFetchProducts` (`src/features/products/model/use-fetch-products.ts:47-75`) keeps the `AbortController` in a ref of the hook instance: a new fetch aborts the previous one, but nothing aborts the request in flight when the page unmounts, and its response is dispatched to the global Redux store (`productsReceived`). Open `/product?q=phone` on a slow network, open a product (change 71) or another route before the response, come back to `/product?category=laptops`: the new page instance has its own ref, so if the `phone` response lands after the `laptops` one, the list shows `phone` products while the URL and the select say `laptops`. The operator chose to fix it now (OI-1924).

## What Changes

- The products request in flight is aborted when the catalog page unmounts; an aborted response is never dispatched (the existing `signal.aborted` check already drops it).
- The "latest request" bookkeeping (abort the previous signal on a new run; abort the current one on demand) moves into a small pure helper with unit tests, and `useFetchProducts` aborts through it in an effect cleanup.
- The requirement "Latest request wins" gets a scenario for leaving the page and coming back.

## Capabilities

### New Capabilities

— none

### Modified Capabilities

- `product-catalog`: "Latest request wins" — a new scenario "Leaving the catalog and coming back"; the requirement text is unchanged (as after the archive of `72-catalog-pagination`).

## Impact

- `src/features/products/model/use-fetch-products.ts`, a new helper (in `src/shared/lib/` — it knows nothing about products) with its unit test.
- No new dependencies. The project has no React component test setup (vitest runs `*.test.ts` in node) and no e2e yet: the hook wiring is proven in the preview with a delayed response; issue #82 (catalog e2e) can add it as a step later.

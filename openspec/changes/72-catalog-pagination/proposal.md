## Why

The catalog on `/product` shows only the first 10 results. Change `22-dummyjson-catalog` says "There SHALL be no pagination controls" (OI-1003 put pagination out of its scope). The operator asked for pagination (issue #72, OI-1467): «пагинация на странице каталога /product — limit/skip, номер страницы в URL». The order of the three new changes is 71 → 72 → 73 (OI-1471).

## What Changes

- The catalog shows the result in pages of 10. There are page controls below the list, and the request uses `limit=10&skip=(page − 1) × 10`.
- The current page is kept in the query parameter `page` (1-based). Page 1 is not written to the URL, so `/product` stays the clean first page.
- A link with `page` opens that page, and each page change adds a browser history entry.
- A new search or category starts again from page 1.
- A `page` that is not a positive integer is replaced by page 1 without a history entry.
- A page past the last one shows `No products found`, with the controls still there to go back.
- The total `N products found` stays as it is.

## Capabilities

### New Capabilities

— none

### Modified Capabilities

- `product-catalog` (from change `22-dummyjson-catalog`): "First 10 products and the total found" becomes paged. New requirements cover the page in the URL and invalid or out-of-range pages. This change is archived after `22-dummyjson-catalog`, because its deltas apply to that capability.

## Impact

- `src/features/products/model/product-url.ts`: parsing and writing `page`. Its unit tests come from #64 (change 22, task 3.1), which is ahead in the merge queue.
- `src/pages/product/product-page.tsx`: the controls, the paging passed to `useFetchProducts`, and the page reset on search and category. It is also touched by 71, which comes first, and by 73 later.
- `src/features/products/model/use-fetch-products.ts` already takes `{ limit, skip }`. No new dependencies: MUI `Pagination` is in `@mui/material`.

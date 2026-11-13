## Context

See proposal.md. These are the facts as checked on 2026-11-13:

- DummyJSON `GET /products?limit=10&skip=190` returns `{ products: [4 items], total: 194, skip: 190, limit: 4 }`.
- `skip=500` returns `{ products: [], total: 194, skip: 500, limit: 0 }`.
- Search and category endpoints take the same `limit`/`skip`.
- `getProducts(query, { limit, skip })` and `useFetchProducts(query, paging)` already exist. The page passes no paging today, so the defaults of 10 and 0 apply.
- The URL is the source of truth for `q`/`category` (`product-url.ts`). `useFetchProducts` aborts the previous request, and the latest request wins.

## Goals / Non-Goals

**Goals:** pages of 10, page controls, `page` in the URL with history, reset on a new query, safe handling of bad links.

**Non-Goals:**
- a page-size choice (10 stays, as in change 22);
- infinite scroll;
- prefetching the next page;
- keeping the page per query (the page is always reset on a new query).

## Decisions

- **Page size stays 10** (decided by plan, OI-1003). `limit=10`, `skip=(page − 1) × 10`.
- **The `page` parameter is 1-based, and page 1 is implicit.** It is parsed in `product-url.ts` with the existing rules:
  - `parseProductsSearchParams` also returns `page: number` (default 1);
  - `productsQueryToSearchParams(query, page?)` writes `page` only when it is above 1;
  - the "needs replace" flag that today covers `q` with `category` also covers an invalid `page`.

  An invalid value is anything but a positive integer in plain decimal, for example `0`, `-1`, `2.5`, `abc` or `02`, and also a number above `Number.MAX_SAFE_INTEGER`. The URL is rewritten with `replace` to the same query without `page`, as the existing conflict rule does. An explicit `page=1` is valid but not canonical: it is rewritten the same way, so page 1 has one address.
  - Several `page` parameters: the first one is read (`URLSearchParams.get`), and the rewrite writes back only the canonical one.
  - The conflict rule and `page` together (`?q=phone&category=smartphones&page=2`): one `replace` fixes both. `category` wins, `q` is removed, and a valid `page` is kept (page 2 of `smartphones`); an invalid `page` is removed in the same rewrite.
- **Every page change pushes a history entry.** Back restores the previous page.
- **Changing search or category drops `page`.** It is the same `setSearchParams` call, so a new query starts at page 1. Back still restores the previous query with its page.
- **Out of range:** with `page` greater than the last page (`ceil(total / 10)`), the API returns an empty `products` with the real `total`.
  - The list shows `No products found`, which is the existing empty message. The total is not shown, because the existing status line shows the empty message for an empty list. The controls stay, so the user can step back.
  - There is no automatic redirect: it keeps the rule simple and makes no second request.
  - This is spelled out in the spec.
- **Controls:** MUI `Pagination` below the list, with `count = ceil(total / 10)` and `page` from the URL.
  - It renders only when `count > 1`, or when the current page is out of range and `count ≥ 1` (so the user can step back). With `total: 0` there are no pages and no controls, only `No products found`.
  - The visibility rule (`count`, `page`, error → shown or not) is a pure helper next to the paging helper, with unit tests.
  - Out of range, MUI marks no page (its `page` is above `count`); that is expected.
  - It is keyboard-usable as MUI provides, inside a `nav` with `aria-label="Pagination"`; MUI gives the page buttons labels like "Go to page 2".
  - After a page is chosen in the controls, the window scrolls to the top of the list. Back and Forward do not scroll: the browser restores its own position.
  - It is hidden while the result is an error.
- **Loading:** the existing loader runs on every page change (the `isFetching` rule from change 22). The previous list stays visible until the new one arrives, as it does today for a query change. The spec modifies the change 22 requirements "Loading indicator" and "Latest request wins" to name page changes: `useFetchProducts` already aborts the previous request, so a late response for an older page does not replace a newer one.
- **Tests:**
  - unit tests in the existing `product-url` tests from #64: parse `page` (absent → 1; `"3"` → 3; invalid values and `"1"` → 1 with replace; conflict + a valid `page` keeps the page), write (page 1 omitted; page 3 written; a query change drops `page`), the skip computation, and the controls visibility rule;
  - the UI is proven in the PR with screenshots against DummyJSON and a network log, as in change 22. There are no e2e tests yet (overlay `commands.e2e` is `—`).

## Risks / Trade-offs

- [`product-url.ts` and its tests are touched by #64, which is in the queue] 72 starts after #64 merges. The brief names the overlap.
- [`product-page.tsx` is touched by 71 and 73 too] The order is 71 → 72 → 73 (OI-1471). Each one rebases onto the previous merge.
- [The archive order is 22, then 72] The deltas are `MODIFIED`/`ADDED` on `product-catalog`, which exists only after `22-dummyjson-catalog` is archived. Validation passes now; the archive of 72 waits for 22.

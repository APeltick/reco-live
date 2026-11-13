## Why

The browser behaviour of the catalog is proven only by manual preview runs and screenshots (#59, #77, #100): the units cover the helpers (debounce, latest request, URL parsing), not their wiring in the page. The most fragile piece is the skip rule of the debounced search (`src/pages/product/product-page.tsx:83`, `(text) => text === urlSearchText`), which keeps "Category clears search" and Back working; the unmount abort of change 81 (`src/features/products/model/use-fetch-products.ts:50-52`) has no automated test either (verify 81, WARNING 1). Issue #82 was blocked until e2e exists; change 94 brings Playwright, the stub and a smoke test (#102). The operator asked to prepare this change now (OI-2112).

The review of #102 found two gaps in the stub: a request to any host other than DummyJSON goes to the live network, and an aborted request fails a test only where the UI asserts on its data (the smoke stays green without categories).

## What Changes

- The stub `tests/e2e/fixtures/mock-dummy-json.ts` grows: answers by path and query (list pages, search, category), records every API request, can hold a response until the test releases it, and blocks every request outside the app's own origin and DummyJSON; any blocked or unmatched request fails the test at its end.
- The smoke test also checks that `Category` offers the stubbed categories (so a broken categories stub fails it).
- A new `tests/e2e/catalog.spec.ts` with the scenarios of the `product-catalog` spec that only a browser proves: search after the pause sends one request; a category clears the search and Back restores URL, field and select; keyboard only; latest request wins; leaving the catalog and coming back; a page change and Back.
- After the tests are on main: the overlay `e2e-map` maps the catalog code to `tests/e2e/catalog.spec.ts`, so gate and CI run it for PRs that touch the catalog (team rules).

No product behaviour changes (`skip_specs: true`); the tests check existing scenarios of `product-catalog`.

## Capabilities

### New Capabilities

— none

### Modified Capabilities

— none

## Impact

- Changed: `tests/e2e/fixtures/mock-dummy-json.ts`, `tests/e2e/smoke.spec.ts`; new: `tests/e2e/catalog.spec.ts`, new JSON fixtures in `tests/e2e/fixtures/`. No `src/` changes.
- Team rules: `ai-team-docs/config/project-overlay.md` → `e2e-map` (task 3.1, a lead PR, merged only by the operator's word with the PR number).
- Every PR runs smoke; PRs touching the catalog also run `catalog.spec.ts` (a few seconds on the stub).
- Depends on #102 (change 94, task 1.1) being merged.

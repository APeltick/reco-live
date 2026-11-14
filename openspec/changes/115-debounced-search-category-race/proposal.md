## Why

While writing the catalog e2e (change 82, PR #110, scenario (b) "category clears search, Back restores"), the test lost the category under Playwright's fake clock. Choosing a category clears the search field (`setSearchText("")`) and pushes `?category=…` (`src/pages/product/product-page.tsx:116-126`). The clear schedules a debounced `""` (`useDebouncedValue`, `:80-94`). Its skip rule `(text) => text === urlSearchText` is read through a ref that is updated in a post-commit effect (`src/features/products/model/use-debounced-value.ts:21-24`). When the 300 ms timer fired before React committed the URL change, the rule still saw `q=phone`, and the page pushed `/product`, so the category was lost. The test now waits for the category render before moving the clock (`tests/e2e/catalog.spec.ts:102-106`). In real time this needs the category commit to come more than 300 ms after the field clear (a slow device, a long main-thread task, a deferred router transition). The operator opened #115 (OI-211, low priority) and took it into work (OI-426) with the condition: "reproduce with a red test first; no fix without a reproduction".

## What Changes

- First a reproduction: an e2e test that makes the debounced `""` fire before the category commit and expects the category to stay. It must be red on main.
- Only if it is red: the skip decision uses the value the user acted on, not a value updated after commit, so a programmatic clear after a category choice is never applied as a search. The specified behaviour of `product-catalog` does not change ("Category clears search", "Search clears category", "Back restores the previous state").
- If no reproduction is possible: no code change; the reason is recorded on the issue and in the PR or report.

No spec change (`skip_specs: true`): the spec already says choosing a category keeps it.

## Capabilities

### New Capabilities

— none

### Modified Capabilities

— none

## Impact

- With a reproduction: `tests/e2e/catalog.spec.ts` (a regression step or test), `src/pages/product/product-page.tsx` and possibly `src/features/products/model/use-debounced-value.ts` (the fix). Without one: nothing in the code.

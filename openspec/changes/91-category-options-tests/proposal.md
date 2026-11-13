## Why

The verify of change `83-category-select-active-filter` (reviewer-1, WARNING 1) found that three scenarios of "Filter by category" in `product-catalog` have no automated test: "Categories cannot be loaded", "Categories cannot be loaded, category in the link" and "Unknown category in the select". The logic is inline in `src/pages/product/product-page.tsx` (`hasUnlistedCategory`, the extra `MenuItem`), so the mutation `hasUnlistedCategory = false` stays green. Issue #91 was opened by lead on the operator's word (OI-1877; standing rule for review follow-ups, OI-1171).

## What Changes

- A pure function `getCategoryOptions(categories, slug)` in `src/features/products/model/` returns the select options in order: `All categories` (value `""`), the extra option for an unlisted URL slug (label — the slug), then the loaded categories (label — `name`, value — `slug`).
- `product-page.tsx` renders the options from it; the rendered select does not change.
- Unit tests for the four cases (below) next to the function.
- The stale comment in `useCategories` ("on failure only `All categories` is offered") is corrected: with a category in the URL its slug is offered too.

## Capabilities

### New Capabilities

— none

### Modified Capabilities

— none. Tests and a refactor with no behaviour change (`skip_specs: true`).

## Impact

- `src/features/products/model/` (new function + its test; exported through the model and feature index), `src/pages/product/product-page.tsx`.
- No new dependencies.

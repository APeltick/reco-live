## Why

The verify of change `22-dummyjson-catalog` (reviewer-1, WARNING 2) found that the spec and the code differ. The requirement "Filter by category" says that when the categories cannot be loaded, the select SHALL offer only `All categories`. The code (`src/pages/product/product-page.tsx`, `hasUnlistedCategory`) also shows the category from the URL as an extra option, labelled with its slug, whenever that slug is not among the loaded categories. That covers the categories request failing or not yet answered, and an unknown slug. So the select always shows the filter the list is using. The operator chose to keep the code and fix the spec (issue #83, OI-1703): «А — оставляем код, спецификацию правим маленьким follow-up change.»

## What Changes

- "Filter by category": the select offers `All categories`, the loaded categories, and — when the URL has a category that is not among them — that category as an extra option labelled with its slug, selected.
- When the categories cannot be loaded and the URL has no category, the select still offers only `All categories` (as today).
- No code change: the code already does this (merged in #59).

## Capabilities

### New Capabilities

— none

### Modified Capabilities

- `product-catalog` (from change `22-dummyjson-catalog`): the requirement "Filter by category" gains the extra option for a category from the URL that is not in the loaded list. This change is archived after `22-dummyjson-catalog`, because its delta applies to that capability.

## Impact

- `openspec/specs/product-catalog/spec.md` after the archive. No code, no tests, no dependencies.
- Change `72-catalog-pagination` modifies other requirements of `product-catalog` ("Pages of 10 products and the total found", "Loading indicator", "Latest request wins"), not this one.

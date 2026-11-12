## Why

Follow-up of the review of PR #64 (change `22-dummyjson-catalog` task 3.1). Issue #65 was opened by lead on the operator's standing rule (OI-1171). The debounce skip rule of `src/features/products/model/use-debounced-value.ts` has no unit test. The rule is that `isSkipped(value)` is checked twice: before scheduling, and again when the timer fires, against the latest state, because the URL may change during the pause. It is proven only in the browser (#59). Testing the hook itself needs `@testing-library/react` and `jsdom`, which the project does not have. `design.md` of change `22-dummyjson-catalog` already names the way without them: «the debounce, if extracted as a small helper, gets a fake-timer unit test».

## What Changes

- A new pure helper in `src/features/products/model/` (no React), named `scheduleDebounced(value, delayMs, isSkipped, callback) → cancel`. It holds the scheduling and both checks of `isSkipped`.
- `useDebouncedValue` keeps its signature and behavior and calls the helper. The latest-callback and latest-skip-check refs stay in the hook.
- Unit tests with `vi.useFakeTimers()` (environment `node`).
- No new dependencies. No product behavior change. The feature's public exports do not change.

## Capabilities

### New Capabilities

— none

### Modified Capabilities

— none. A refactor and tests only (`skip_specs: true`).

## Impact

- `src/features/products/model/use-debounced-value.ts` and a new helper file with its test next to it in `src/features/products/model/`. `src/pages/product/product-page.tsx` is not changed.

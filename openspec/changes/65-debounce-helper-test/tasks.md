## 1. Debounce helper and its unit test

- [ ] 1.1 [standard] In `src/features/products/model/` add a pure helper (no React import), for example `schedule-debounced.ts` with `scheduleDebounced<Value>(value, delayMs, isSkipped, callback): () => void`. It returns a cancel function. When `isSkipped(value)` is true up front, nothing is scheduled and it returns a no-op. Otherwise it sets a timer for `delayMs`. When the timer fires, it calls `isSkipped(value)` again and calls `callback(value)` only if it is still false. Cancel clears the timer. `useDebouncedValue` keeps its signature, behavior and effect deps `[value, delayMs]`. Its effect returns `scheduleDebounced(value, delayMs, (v) => skipCheckReference.current(v), (v) => callbackReference.current(v))`, so both checks and the call read the latest refs. Do not export the helper from the feature index unless lint requires it. `product-page.tsx` does not change. Add `schedule-debounced.test.ts` next to it, using `vi.useFakeTimers()` and restoring real timers after each test. Cases:
  - (a) not skipped: `callback` is not called before `delayMs` and is called once with the value at `delayMs`;
  - (b) skipped up front: no timer is pending (`vi.getTimerCount() === 0`) and `callback` is never called;
  - (c) `isSkipped` turns true during the pause (a mutable flag read by the predicate): at `delayMs` `callback` is not called;
  - (d) cancel before `delayMs`: `callback` is never called.

  Verify:
  - `npm run check` passes;
  - mutation check in place, one at a time:
    - remove the re-check inside the timer → (c) fails;
    - remove the up-front check → (b) fails;
    - after each, restore with `git checkout -- <helper file>`;
  - `git diff --stat` lists only the helper, its test, `use-debounced-value.ts` and `tasks.md`;
  - preview against DummyJSON: typing `phone` on `/product` still sends one search request after the pause (network log in the PR).

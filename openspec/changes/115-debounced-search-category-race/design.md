## Context

`ProductPage` keeps the field text in state (`searchText`) and the URL in `useSearchParams`. `handleCategoryChange` (`product-page.tsx:116-126`) does `setSearchText("")` and `setSearchParams(category)` in one handler. `useDebouncedValue(searchText.trim(), 300, isSkipped, apply)` (`:80-94`) schedules `apply` through `scheduleDebounced` (`schedule-debounced.ts`), which checks `isSkipped` up front and again when the timer fires. The hook stores `isSkipped` in a ref that is updated in an effect after every commit (`use-debounced-value.ts:21-24`). `isSkipped` is `(text) => text === urlSearchText`, where `urlSearchText` is the value of the last committed render.

## Goals / Non-Goals

Goals: a deterministic red test, or an argued "not reachable". If red: a fix that keeps every `product-catalog` scenario.

Non-goals: changing the debounce delay or the specified behaviour; a component-test layer (the project has none).

## Decisions

- **Reproduce first (the operator's condition, OI-426).** The executor writes the test and runs it on main before any fix. The red run goes into `Proof:` as command → output. No reproduction → stop and report (see "If not reachable").
- **The reproduction layer is e2e.** The defect is in the wiring of the handler, React's commit and the hook's ref, and the project has no component-test layer. `scheduleDebounced` alone is already unit-tested and correct. The test models "the category commit arrives after the debounce": Playwright's fake clock fires the pending 300 ms timer before React commits the new URL. That is what the catalog (b) test hit before it waited for the render. Concretely: on a paused clock, type `phone` and let it apply. Then choose `Laptops`, and move the clock past the debounce **without** first waiting for the laptops render. Expect the URL to stay `/product?category=laptops`, the field to stay empty and the laptops to be listed. Red on main = reproduced.
- **Real-time reachability is asked too.** The fake clock shows the ordering bug, but the operator wants to know whether a user can hit it. In `Proof:` the executor also tries a real-time run with Chromium CPU throttling through CDP (`Emulation.setCPUThrottlingRate`, for example 6× and 20×), and reports whether the category is lost and how often. This is a scratch check, not a committed test (timing-based tests flake). Its result decides nothing alone: the fake-clock red test is the reproduction. It is reported so that the operator knows the real-world risk.
- **The fix, only if reproduced.** The skip decision must not depend on a value that is updated after commit. The preferred way is the smallest one: `handleCategoryChange` records the text it cleared to (`""`) synchronously, for example in a ref that `isSkipped` also reads, so the debounced `""` that the clear schedules is skipped whatever the commit timing. A typed `""` (the user clears the field, scenario "User clears the search") is still applied. The executor may choose another way of the same kind, and says which in `Proof:`. Not acceptable: a longer debounce, or waiting for a render inside the timer.
- **The catalog (b) test stays as it is.** It proves the specified scenario with the realistic order (render first). The new test is the regression for the late-commit order.
- **If not reachable.** If the fake-clock test is green on main (the race cannot be produced even with the forced order), there is no code change and no PR with a fix. The executor reports the runs; lead records on #115 why it is not reachable, and the operator decides the closing.

## Risks / Trade-offs

- [Fake clock vs React scheduler] React's scheduler does not run on the faked `setTimeout` (it uses `MessageChannel`), so `runFor` can fire the debounce before React commits. This is exactly the forced order the test needs. If a future React or Playwright changes that and the test turns green without a fix, the Proof says so.
- [Spec] The fix must keep "User clears the search" (a typed empty field applies) and "Search clears category". The existing catalog tests (a), (b) and (g) must stay green.

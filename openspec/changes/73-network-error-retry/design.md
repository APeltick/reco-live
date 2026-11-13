## Context

See proposal.md. In `src/shared/api/request.ts` a failure can happen at several points:

- `fetch` rejects. An abort is rethrown as is. Anything else becomes `RequestError("Network request failed.", { cause })`, with no `response`, and is reported as kind `network`.
- A non-2xx status becomes `RequestError` with `response`.
- A missing API URL becomes `RequestError("API URL is not configured.")`, with no `response` and no cause from fetch.
- A body that cannot be parsed (`parseJson`) or a response of the wrong shape (`requestParsed`) becomes `RequestError` with `response`.

So "no `response`" alone is not a safe sign of a network error, because the missing API URL looks the same.

## Goals / Non-Goals

**Goals:**
- a reliable way to tell a network error from the other errors;
- its own message on the catalog and the product page, with the existing `Try again` behavior.

**Non-Goals:**
- detecting `navigator.onLine` or listening for "back online";
- automatic retries;
- timeouts (there is no request timeout today);
- a message for the categories request (it already fails silently, per change 22);
- any change to the not-found page, the route error page, or the 404 path of the product page.

## Decisions

- **The mark lives on `RequestError` and is set at the one place that knows.** `RequestError` gets `readonly isNetworkError: boolean`, which defaults to `false`. Only the branch where `fetch` rejects and the request was not aborted sets it to `true`.
  - A helper `isNetworkError(error: unknown): boolean` (an instance check plus the flag) is exported from `~shared/api`.
  - This is clearer than guessing from `response === undefined`, which a missing API URL would also match.
  - The error report kind `network` already exists and does not change.
- **One message text** for both pages: `No connection to the server. Check your internet connection and try again.` It says what happened and what to do, with no technical detail. The button stays `Try again` (OI-1471) and keeps its current action:
  - catalog: `refetch` of the same request;
  - product page: `revalidate()` (change 71).
- **One shared piece for the alert.** The MUI `Alert severity="error"` with the message and the `Try again` button is used on both pages. The text depends on `isNetworkError(error)`; otherwise it is the page's own generic text. It goes in `src/shared/ui/` (it knows nothing about products), or in the products feature if the executor finds it fits better; the choice is named in the PR. The alert keeps `role="alert"`, so screen readers announce it.
- **The product page** (from 71) already gets a non-404 failure as a returned error result from its loader. It passes that error to the same piece. The 404 path stays a thrown 404 route response, so the not-found page is unchanged.
- **Tests:**
  - unit in `request.test.ts`: a rejected `fetch` gives `isNetworkError === true`; a 500, a missing API URL and an abort give `false` (an abort is rethrown, not wrapped);
  - `isNetworkError` on a non-`RequestError` gives `false`;
  - the message choice is a pure function (error → text) with unit tests, if the executor extracts it; otherwise it is proven by screenshots;
  - both pages are proven in the PR with screenshots: the network error (request blocked or offline in the browser), the server error (500 intercepted), and `Try again` recovering after the block is lifted. There are no e2e tests yet (overlay `commands.e2e` is `—`).

## Risks / Trade-offs

- [A CORS block also counts as a network error] The browser gives no response object for it either. "No connection to the server" is still the honest message from the user's side.
- [`request.ts` and its tests are touched by #63 (change 57)] 73 starts after #63 and 71 are merged (the queue order). The brief names the overlap.
- [The archive order is 22 → 71 → 73] The deltas are `MODIFIED` on capabilities that exist only after those archives. Validation passes now.

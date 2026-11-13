## Why

When the network is down, the catalog shows the same `Could not load products.` it shows for a server error or a broken response. The user cannot tell that the problem is their connection. The operator asked for a clear network error with a retry button on the catalog and on the product page, leaving the 404 page alone (issue #73, OI-1467): «понятная ошибка сети с кнопкой «Повторить» на каталоге и странице товара (404 уже есть, не трогать)». The button keeps the English text `Try again`, because the interface is in English (OI-1471: «Оставляйте «Try again», интерфейс на английском»). The order of the three changes is 71 → 72 → 73 (OI-1471).

## What Changes

- A request that gets no response at all is a network error. That covers offline, DNS failure, an unreachable host, and a request blocked before a response. On the catalog and on the product page it shows its own message: `No connection to the server. Check your internet connection and try again.`, with the `Try again` button that repeats the request.
- Other failures keep their current messages: `Could not load products.` on the catalog and `Could not load the product.` on the product page (change 71). These are a non-2xx status or a response of the wrong shape.
- The not-found page and the 404 handling of the product page (change 71) do not change.
- `RequestError` tells a network error apart from the other kinds. A cancelled request is still not an error that is shown.

## Capabilities

### New Capabilities

— none

### Modified Capabilities

- `product-catalog` (change `22-dummyjson-catalog`): "Empty and error messages" splits out the network error.
- `product-details` (change `71-product-details`): "Loading and error states of the product page" splits out the network error.

This change is archived after `22-dummyjson-catalog` and `71-product-details`.

## Impact

- `src/shared/api/request.ts`: a network-error mark on `RequestError`, set only where `fetch` itself rejects. The tests are in `request.test.ts`, which #63 (change 57) also touches; it is ahead in the queue.
- A small shared error-message piece (in `src/shared/ui/` or in the products feature; the executor's choice, named in the PR) used by both pages.
- `src/pages/product/product-page.tsx` and the product details page from 71. 73 starts after 71's page is merged.
- No new dependencies.

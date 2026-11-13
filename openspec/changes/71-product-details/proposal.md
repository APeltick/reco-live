## Why

The catalog on `/product` shows only product titles, and there is no page for a single product. Change `22-dummyjson-catalog` listed "a product details page" as a Non-Goal. The operator asked for one (issue #71, OI-1467): «страница товара /products/:id из DummyJSON /products/{id} — фото, цена, описание, ссылка назад с сохранением фильтров».

## What Changes

- A new route `/products/:id`. It loads the product from DummyJSON `GET /products/{id}` and shows its photo, title, price and description.
- Each product title in the catalog on `/product` becomes a link to its details page.
- A `Back to products` link on the details page returns to the catalog with the search, category (and, once change `72-catalog-pagination` lands, the page) the user came from. When the page is opened directly, the link leads to `/product`.
- An id that is not a positive integer, or a product the API does not know (404), shows the existing not-found page. The not-found page itself does not change.
- While the page loads it shows a loading indicator. If the load fails it shows an error alert with `Try again`. Change `73-network-error-retry` will later add a separate message for network errors.

## Capabilities

### New Capabilities

- `product-details`: the product details page, its content, the back link, and its loading, not-found and error states. The catalog titles linking to it are part of this capability too, so the change does not depend on the archive order of `22-dummyjson-catalog`.

### Modified Capabilities

— none. The not-found page, the route error page and the document title (`Reco Live` on every page) stay as they are.

## Impact

- `src/features/products/api`: a new `getProductById(id, signal)` that reuses `ProductSchema`. The `PRODUCT_URLS.productById` constant already exists.
- `src/features/products/model`: pure helpers for parsing the route id and building the back link, with unit tests.
- `src/pages/product-details/` (new page), `src/shared/config/routes/routes.constants.ts`, `src/app/router/router.tsx`.
- `src/pages/product/product-page.tsx`: titles become links. Changes 72 and 73 touch the same file later, in that order (OI-1471).
- No new dependencies.

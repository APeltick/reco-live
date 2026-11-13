## 1. Data and rules (#71)

- [x] 1.1 [standard] Data and the decision rule per `design.md`, all exported through the feature index:
  - `getProductById(id, signal): Promise<Product | null>` in `src/features/products/api/`: `PRODUCT_URLS.productById`, `request()` with `allowedStatusCodes: [404]` (`404` → `null`, not reported), `200` parsed with `ProductSchema` (wrong shape → `RequestError`).
  - In `src/features/products/model/`: `parseProductId(param) → number | null` (digits only, no leading zero, ≥ 1, ≤ `Number.MAX_SAFE_INTEGER`); the back-link builder (`from` → `/product` + `from` when it is a string that is empty or starts with `?`, otherwise `/product`); `resolveProductDetails(idParam, getById, signal)` → `{ kind: "not-found" }` | `{ kind: "product", product }` | `{ kind: "error", error }` (rejected id → `not-found` without calling `getById`; `null` → `not-found`; a thrown `RequestError` → `error`; anything else rethrown).

  Unit tests next to the code:
  - `getProductById` with a stubbed `fetch`: valid DummyJSON product fixture → data; `404` → `null` and `sendErrorReport` not called; `500` → `RequestError`; wrong shape → `RequestError`.
  - `parseProductId`: `"12"` → 12; `"0"`, `"01"`, `"-1"`, `"+1"`, `" 1"`, `"1.5"`, `"abc"`, `"12abc"`, `""`, `"99999999999999999999"` → `null`.
  - The back link: `"?category=laptops"` → `/product?category=laptops`; `""` → `/product`; `undefined`, a number, `"//evil"`, `"/x"` → `/product`.
  - `resolveProductDetails` with a fake `getById`: `"abc"` → `not-found` and `getById` not called; `null` → `not-found`; a product → `product`; a `RequestError` for a 500, a network failure and a wrong shape → `error`, not thrown; a plain `Error` → rethrown.

  Verify:
  - `npm run check` passes;
  - mutation check, one at a time, each restored with `git checkout -- <file>` (stage the new files first):
    - let `parseProductId` accept `"0"` → a test fails;
    - make `resolveProductDetails` rethrow a `RequestError` → a test fails;
    - call `getById` before parsing the id → a test fails.

## 2. Page and links (#71)

- [x] 2.1 [standard] The route, the page and the pending indicators per the spec and `design.md`:
  - a route constant in `routes.constants.ts`;
  - in `router.tsx`, the `/products/:id` route: a thin loader over `resolveProductDetails` (throws a 404 route response for `not-found`, returns the result otherwise), `HydrateFallback: ContainerLoader`, and the page loaded lazily like `/product`;
  - the page `src/pages/product-details/`: image (`images[0]` → `thumbnail`, alt = title), `h1` title, price `$x.xx` (`Intl.NumberFormat` en-US USD), description; `Back to products` built from `location.state.from`; `ContainerLoader` while `useRevalidator().state === "loading"`; for an `error` result, an `Alert` `Could not load the product.` with `Try again` → `useRevalidator().revalidate()`;
  - in `src/app/layouts/main-layout/main-layout.tsx`, an MUI `LinearProgress` at the top while `useNavigation().state === "loading"`, and `position: relative` on the layout;
  - in `src/pages/product/product-page.tsx`, each title becomes a router `Link` to `/products/<id>` with `state: { from: location.search }`.

  Verify against DummyJSON in the preview, with screenshots:
  - `/product?category=laptops` → open a product → the content is shown → `Back to products` → `/product?category=laptops` with the category selected;
  - `/products/1` opened directly → the back link goes to `/product`;
  - first load with the product response delayed (request interception or throttling): a direct open of `/products/1` shows `ContainerLoader` inside the layout, not a blank screen, and a click on a catalog title shows the `LinearProgress` above the catalog until the details page appears;
  - `/products/abc` and `/products/9999` → the not-found page (network log: no request for `abc`);
  - the product request answered with 500 (request interception in the screenshot tool, or DevTools) → `Could not load the product.` + `Try again` inside the layout; with the interception removed, `Try again` shows the loader and then the product, without a page reload;
  - the title link can be focused with Tab and opens in a new tab;
  - `npm run check` passes.

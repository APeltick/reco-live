## Why

The product page `/products/:id` (spec `product-details`, change 71) is proven in a browser only by the smoke (catalog → product → `Back to products`) and by manual Proof. Units prove the helpers (`createProductBackLink`, `getProductPhoto`, `formatUsdPrice`, `resolveProductDetails`), not their wiring: the catalog passing its query in the link state (`src/pages/product/product-page.tsx:189`), the route loader turning not-found into the 404 page (`src/app/router/router.tsx:32-44`), the loading indicators (`HydrateFallback` and the layout's navigation loader), the error alert and the retry through the revalidator. The operator asked for it (OI-17, OI-122; issue #111 opened on OI-154) once the strict stub of change 82 exists (#110, merged).

## What Changes

- The stub `tests/e2e/fixtures/mock-dummy-json.ts` records a held request with no fixture as a violation (verify 82, W1), and can make the first matching request fail: an HTTP status (`404`, `500`) or no response (network error). Like `hold`, only the first match; the request is still logged and is not a violation.
- A new `tests/e2e/product-details.spec.ts` with the `product-details` scenarios that only a browser proves: a direct open (the product shown, as steps) and Back (Back to a filtered catalog is already proven by `catalog.spec.ts`), not-found for a bad id (no request sent) and for a `404`, loading on a direct open and after a click in the catalog, request fails / no connection, and retry without reloading the app. Data cases (no images, price format, a response of the wrong shape) stay unit-level, where they are already tested.
- After the tests are on main: the overlay `e2e-map` maps the product page code to the new spec file (team rules).

No product behaviour changes (`skip_specs: true`).

## Capabilities

### New Capabilities

— none

### Modified Capabilities

— none

## Impact

- Changed: `tests/e2e/fixtures/mock-dummy-json.ts`; new: `tests/e2e/product-details.spec.ts`. No `src/` changes.
- Team rules: `ai-team-docs/config/project-overlay.md` → `e2e-map` (task 3.1, a lead PR, merged only by the operator's word with the PR number).
- Depends on change 82 (#110, merged): `test.ts` fixture, `requests`, `hold`, the origin guard.

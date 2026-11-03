## Why

`npm audit --omit=dev --audit-level=high` (the pre-push hook step "Audit production dependencies", `npm run audit`) is red again: one high advisory in a production dependency — `zod` 4.4.3, GHSA-mrhx-c7xc-m3w5 (memory exhaustion while validating oversized constrained collections), fixed in 4.6.6. The hook blocks every push (issue #14). `zod` is pinned to an exact version, so `npm audit fix` without `--force` does not upgrade it.

## What Changes

- `zod` 4.4.3 → 4.6.7 (exact version, latest 4.x patch; ≥ 4.6.6 fixes GHSA-mrhx-c7xc-m3w5). Lockfile updated accordingly.
- After this change `npm run audit` exits 0 and a plain `git push` passes the pre-push hook without `LEFTHOOK_EXCLUDE`.

## Capabilities

### New Capabilities

— none

### Modified Capabilities

— none. Dependency change only: no product behavior changes (`skip_specs: true`).

## Impact

- `package.json`, `package-lock.json` (risky paths — full review).
- `zod` is used for product data validation: `src/features/products/model/product.schemas.ts`, `product.types.ts` (inferred types), `src/shared/lib/validation/data-validation.ts` (`import type`), called from `src/features/products/api/get-products.ts`. Minor upgrade within 4.x — the product list must load and validate as before.
- Not in this change: returning `git_hooks: run` in the project overlay (`install-choices`) after this is merged — a separate team-rules PR by lead, merged only by the person's word with the PR number (operator, OI-235).

import type { Product } from "./product.types";

import { RequestError } from "~shared/api";

import { parseProductId } from "./parse-product-id";

export type ProductDetailsResult
  = | { error: RequestError;
    kind: "error"; }
    | { kind: "not-found" }
    | { kind: "product";
      product: Product; };

export async function resolveProductDetails(
  idParameter: string | undefined,
  getById: (id: number, signal?: AbortSignal) => Promise<Product | null>,
  signal?: AbortSignal,
): Promise<ProductDetailsResult> {
  const id = parseProductId(idParameter);

  if (id === null) {
    return { kind: "not-found" };
  }

  try {
    const product = await getById(id, signal);

    return product === null
      ? { kind: "not-found" }
      : {
          kind: "product",
          product,
        };
  } catch (error) {
    if (error instanceof RequestError) {
      return {
        error,
        kind: "error",
      };
    }

    throw error;
  }
}

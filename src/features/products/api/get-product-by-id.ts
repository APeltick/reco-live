import type { Product } from "../model/product.types";

import {
  request,
  RequestError,
} from "~shared/api";
import { parseJson } from "~shared/api/parse-json";
import { dataParse } from "~shared/lib/validation";

import { ProductSchema } from "../model/product.schemas";
import { PRODUCT_URLS } from "./product-api.constants";

const T_T_DEV = {
  title: "Product request failed",
  validationError: "Product response failed validation.",
} as const;

const NOT_FOUND_STATUS = 404;

export async function getProductById(
  id: number,
  signal?: AbortSignal,
): Promise<Product | null> {
  const response = await request({
    allowedStatusCodes: [NOT_FOUND_STATUS],
    errorReport: {
      functionName: "getProductById",
      title: T_T_DEV.title,
    },
    headers: { Accept: "application/json" },
    ...(signal !== undefined && { signal }),
    url: PRODUCT_URLS.productById(id),
  });

  if (response.status === NOT_FOUND_STATUS) {
    return null;
  }

  const responseData = await parseJson(response);

  const parsed = dataParse(
    responseData,
    ProductSchema,
    { parseErrorText: T_T_DEV.validationError },
  );

  if (parsed.failed) {
    throw new RequestError(T_T_DEV.validationError, { response });
  }

  return parsed.data;
}

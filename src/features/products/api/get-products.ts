import type {
  GetProductsParams,
  ProductsCollection,
} from "../model/product.types";

import {
  request,
  RequestError,
} from "~shared/api";
import { parseJson } from "~shared/api/parse-json";
import { dataParse } from "~shared/lib/validation";

import { ProductsCollectionSchema } from "../model/product.schemas";
import { PRODUCT_URLS } from "./product-api.constants";

const T_T_DEV = {
  invalidJson: "Products response is not valid JSON.",
  validationError: "Products response failed validation.",
} as const;

const DEFAULT_GET_PRODUCTS_PARAMS: Required<GetProductsParams> = {
  _page: 1,
  _per_page: 5,
};

export async function getProducts(
  params: GetProductsParams = DEFAULT_GET_PRODUCTS_PARAMS,
  signal?: AbortSignal,
): Promise<ProductsCollection> {
  const response = await request({
    errorReport: {
      functionName: "getProducts",
      title: "Products request failed",
    },
    headers: { Accept: "application/json" },
    ...(signal !== undefined && { signal }),
    url: createProductsUrl(params),
  });

  const responseData = await parseJson(response);

  const parsedProducts = dataParse(
    responseData,
    ProductsCollectionSchema,
    { parseErrorText: T_T_DEV.validationError },
  );

  if (parsedProducts.failed) {
    throw new RequestError(T_T_DEV.validationError, { response });
  }

  return parsedProducts.data;
}

function createProductsUrl(params: GetProductsParams): string {
  const searchParams = new URLSearchParams();

  if (params._page !== undefined) {
    searchParams.set("_page", String(params._page));
  }

  if (params._per_page !== undefined) {
    searchParams.set("_per_page", String(params._per_page));
  }

  const query = searchParams.toString();

  return query.length === 0
    ? PRODUCT_URLS.productsCollection
    : `${PRODUCT_URLS.productsCollection}?${query}`;
}

import type {
  Categories,
  ProductsCollection,
  ProductsPaging,
  ProductsQuery,
} from "../model/product.types";
import type { z } from "zod";

import {
  request,
  RequestError,
} from "~shared/api";
import { parseJson } from "~shared/api/parse-json";
import { dataParse } from "~shared/lib/validation";

import {
  CategoriesSchema,
  ProductsCollectionSchema,
} from "../model/product.schemas";
import { PRODUCT_URLS } from "./product-api.constants";

const T_T_DEV = {
  categoriesTitle: "Categories request failed",
  productsTitle: "Products request failed",
  validationError: "Products response failed validation.",
} as const;

export async function getProducts(
  query: ProductsQuery,
  paging: ProductsPaging,
  signal?: AbortSignal,
): Promise<ProductsCollection> {
  return requestParsed(
    createProductsUrl(query, paging),
    ProductsCollectionSchema,
    {
      functionName: "getProducts",
      title: T_T_DEV.productsTitle,
    },
    signal,
  );
}

export async function getCategories(
  signal?: AbortSignal,
): Promise<Categories> {
  return requestParsed(
    createCategoriesUrl(),
    CategoriesSchema,
    {
      functionName: "getCategories",
      title: T_T_DEV.categoriesTitle,
    },
    signal,
  );
}

export function createCategoriesUrl(): string {
  return PRODUCT_URLS.categories;
}

export function createProductsUrl(
  query: ProductsQuery,
  paging: ProductsPaging,
): string {
  const searchParams = new URLSearchParams();

  if (query.kind === "search") {
    searchParams.set("q", query.q);
  }

  searchParams.set("limit", String(paging.limit));
  searchParams.set("skip", String(paging.skip));

  return `${getProductsPath(query)}?${searchParams.toString()}`;
}

function getProductsPath(query: ProductsQuery): string {
  switch (query.kind) {
    case "all": {
      return PRODUCT_URLS.productsCollection;
    }
    case "category": {
      return PRODUCT_URLS.productsByCategory(query.slug);
    }
    case "search": {
      return PRODUCT_URLS.productsSearch;
    }
  }
}

interface RequestErrorReportInfo {
  functionName: string;
  title: string;
}

async function requestParsed<Schema extends z.ZodType>(
  url: string,
  schema: Schema,
  errorReport: RequestErrorReportInfo,
  signal?: AbortSignal,
): Promise<z.infer<Schema>> {
  const response = await request({
    errorReport,
    headers: { Accept: "application/json" },
    ...(signal !== undefined && { signal }),
    url,
  });

  const responseData = await parseJson(response);

  const parsed = dataParse(
    responseData,
    schema,
    { parseErrorText: T_T_DEV.validationError },
  );

  if (parsed.failed) {
    throw new RequestError(T_T_DEV.validationError, { response });
  }

  return parsed.data;
}

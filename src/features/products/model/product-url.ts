import type { ProductsQuery } from "./product.types";

export const SEARCH_PARAM = "q";
export const CATEGORY_PARAM = "category";

export interface ParsedProductsParams {
  /** Both `q` and `category` were present: `category` wins, `q` must be removed. */
  hasConflict: boolean;
  query: ProductsQuery;
}

/** Search params of the page → query. Trims `q`; blank `q` is absent; `category` wins over `q`. */
export function parseProductsSearchParams(
  searchParams: URLSearchParams,
): ParsedProductsParams {
  const category = searchParams.get(CATEGORY_PARAM);
  const q = (searchParams.get(SEARCH_PARAM) ?? "").trim();
  const hasCategory = category !== null && category !== "";
  const hasSearch = q !== "";

  if (hasCategory) {
    return {
      hasConflict: hasSearch || searchParams.has(SEARCH_PARAM),
      query: {
        kind: "category",
        slug: category,
      },
    };
  }

  if (hasSearch) {
    return {
      hasConflict: false,
      query: {
        kind: "search",
        q,
      },
    };
  }

  return {
    hasConflict: false,
    query: { kind: "all" },
  };
}

/** Query → search params of the page (never both `q` and `category`). */
export function productsQueryToSearchParams(
  query: ProductsQuery,
): URLSearchParams {
  const searchParams = new URLSearchParams();

  if (query.kind === "search") {
    const q = query.q.trim();

    if (q !== "") {
      searchParams.set(SEARCH_PARAM, q);
    }
  } else if (query.kind === "category" && query.slug !== "") {
    searchParams.set(CATEGORY_PARAM, query.slug);
  }

  return searchParams;
}

/** The text of the search the query stands for (`""` when it is not a search). */
export function getQuerySearchText(query: ProductsQuery): string {
  return query.kind === "search" ? query.q : "";
}

/** The slug of the category the query stands for (`""` when it is not a category). */
export function getQueryCategorySlug(query: ProductsQuery): string {
  return query.kind === "category" ? query.slug : "";
}

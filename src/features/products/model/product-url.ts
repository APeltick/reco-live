import type { ProductsPaging, ProductsQuery } from "./product.types";

export const SEARCH_PARAM = "q";
export const CATEGORY_PARAM = "category";
export const PAGE_PARAM = "page";

export const PRODUCTS_PAGE_SIZE = 10;
const PLAIN_POSITIVE_INTEGER = /^[1-9]\d*$/;

export interface ParsedProductsParams {
  /** Both `q` and `category` were present: `category` wins, `q` must be removed. */
  hasConflict: boolean;
  query: ProductsQuery;
  /** The page, counted from 1 (absent or invalid → 1). */
  page: number;
  /** The URL is not canonical: a conflict, or a `page` that is invalid or `1`. */
  needsReplace: boolean;
}

/** `page` param → the page and whether the value must be removed from the URL. */
function parsePage(raw: string | null): { page: number;
  isCanonical: boolean; } {
  if (raw === null) {
    return {
      page: 1,
      isCanonical: true,
    };
  }

  if (PLAIN_POSITIVE_INTEGER.test(raw)) {
    const page = Number(raw);

    if (Number.isSafeInteger(page)) {
      return {
        page,
        isCanonical: page > 1,
      };
    }
  }

  return {
    page: 1,
    isCanonical: false,
  };
}

/** Search params of the page → query. Trims `q`; blank `q` is absent; `category` wins over `q`. */
export function parseProductsSearchParams(
  searchParams: URLSearchParams,
): ParsedProductsParams {
  const category = searchParams.get(CATEGORY_PARAM);
  const q = (searchParams.get(SEARCH_PARAM) ?? "").trim();
  const hasCategory = category !== null && category !== "";
  const hasSearch = q !== "";
  const { page, isCanonical } = parsePage(searchParams.get(PAGE_PARAM));

  if (hasCategory) {
    const hasConflict = hasSearch || searchParams.has(SEARCH_PARAM);

    return {
      hasConflict,
      page,
      needsReplace: hasConflict || !isCanonical,
      query: {
        kind: "category",
        slug: category,
      },
    };
  }

  if (hasSearch) {
    return {
      hasConflict: false,
      page,
      needsReplace: !isCanonical,
      query: {
        kind: "search",
        q,
      },
    };
  }

  return {
    hasConflict: false,
    page,
    needsReplace: !isCanonical,
    query: { kind: "all" },
  };
}

/** Query (and page) → search params of the page (never both `q` and `category`; page 1 is not written). */
export function productsQueryToSearchParams(
  query: ProductsQuery,
  page = 1,
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

  if (page > 1) {
    searchParams.set(PAGE_PARAM, String(page));
  }

  return searchParams;
}

/** Page (from 1) → the paging of the request. */
export function pageToPaging(page: number): ProductsPaging {
  return {
    limit: PRODUCTS_PAGE_SIZE,
    skip: (page - 1) * PRODUCTS_PAGE_SIZE,
  };
}

/** Pagination controls: more than one page, or past the last page (with a page to step back to); never with an error. */
export function shouldShowPagination({
  count,
  page,
  hasError,
}: {
  count: number;
  page: number;
  hasError: boolean;
}): boolean {
  if (hasError) {
    return false;
  }

  return count > 1 || (count >= 1 && page > count);
}

/** The text of the search the query stands for (`""` when it is not a search). */
export function getQuerySearchText(query: ProductsQuery): string {
  return query.kind === "search" ? query.q : "";
}

/** The slug of the category the query stands for (`""` when it is not a category). */
export function getQueryCategorySlug(query: ProductsQuery): string {
  return query.kind === "category" ? query.slug : "";
}

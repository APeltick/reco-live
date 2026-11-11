import type {
  Product,
  ProductsCollection,
  ProductsPaging,
  ProductsQuery,
} from "./product.types";
import type { FetchState } from "~shared/lib/hooks";

import { useCallback } from "react";
import {
  useDispatch,
  useSelector,
} from "react-redux";
import { useFetch } from "~shared/lib/hooks";

import { getProducts } from "../api/get-products";
import {
  productsReceived,
  selectProducts,
  selectProductsCollection,
} from "./product-slice";

interface UseFetchProductsResult extends FetchState {
  collection: ProductsCollection | null;
  data: Product[];
}

const DEFAULT_QUERY: ProductsQuery = { kind: "all" };
const DEFAULT_PAGING: ProductsPaging = {
  limit: 10,
  skip: 0,
};

export function useFetchProducts(
  query: ProductsQuery = DEFAULT_QUERY,
  paging: ProductsPaging = DEFAULT_PAGING,
): UseFetchProductsResult {
  const dispatch = useDispatch();
  const collection = useSelector(selectProductsCollection);
  const data = useSelector(selectProducts);
  const { limit, skip } = paging;
  const queryKind = query.kind;
  const queryValue = getQueryValue(query);

  const fetchProducts = useCallback(async () => {
    const currentQuery = toQuery(queryKind, queryValue);
    const receivedProducts = await getProducts(currentQuery, {
      limit,
      skip,
    });

    dispatch(productsReceived(receivedProducts));

    return receivedProducts;
  }, [dispatch, limit, queryKind, queryValue, skip]);

  const fetchState = useFetch(fetchProducts);

  return {
    collection,
    data,
    ...fetchState,
  };
}

function getQueryValue(query: ProductsQuery): string {
  switch (query.kind) {
    case "all": {
      return "";
    }
    case "category": {
      return query.slug;
    }
    case "search": {
      return query.q;
    }
  }
}

function toQuery(
  kind: ProductsQuery["kind"],
  value: string,
): ProductsQuery {
  switch (kind) {
    case "all": {
      return DEFAULT_QUERY;
    }
    case "category": {
      return {
        kind,
        slug: value,
      };
    }
    case "search": {
      return {
        kind,
        q: value,
      };
    }
  }
}

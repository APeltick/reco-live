import type {
  GetProductsParams,
  Product,
  ProductsCollection,
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

const PARAM_DEFAULT_PAGE = 1;
const PARAM_DEFAULT_PER_PAGE = 10;

export function useFetchProducts(
  params: GetProductsParams = {},
): UseFetchProductsResult {
  const dispatch = useDispatch();
  const collection = useSelector(selectProductsCollection);
  const data = useSelector(selectProducts);
  const page = params._page ?? PARAM_DEFAULT_PAGE;
  const perPage = params._per_page ?? PARAM_DEFAULT_PER_PAGE;

  const fetchProducts = useCallback(async () => {
    const receivedProducts = await getProducts({
      _page: page,
      _per_page: perPage,
    });

    dispatch(productsReceived(receivedProducts));

    return receivedProducts;
  }, [dispatch, page, perPage]);

  const fetchState = useFetch(fetchProducts);

  return {
    collection,
    data,
    ...fetchState,
  };
}

import type {
  Product,
  ProductsCollection,
} from "./product.types";
import type { PayloadAction } from "@reduxjs/toolkit";

import { createSlice } from "@reduxjs/toolkit";

export interface ProductState {
  collection: ProductsCollection | null;
}

interface ProductStoreState {
  products: ProductState;
}

const initialState: ProductState = { collection: null };
const EMPTY_PRODUCTS: Product[] = [];
const SLICE_PRODUCT_NAME = "products";

const productSlice = createSlice({
  initialState,
  name: SLICE_PRODUCT_NAME,
  reducers: {
    productsReceived(
      state,
      action: PayloadAction<ProductsCollection>,
    ) {
      state.collection = action.payload;
    },
  },
});

export const { productsReceived } = productSlice.actions;
export const productReducer = productSlice.reducer;

export function selectProductsCollection(
  state: ProductStoreState,
): ProductsCollection | null {
  return state.products.collection;
}

export function selectProducts(
  state: ProductStoreState,
): Product[] {
  return state.products.collection?.data ?? EMPTY_PRODUCTS;
}

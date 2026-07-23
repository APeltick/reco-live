import type {
  ProductSchema,
  ProductsCollectionSchema,
} from "./product.schemas";
import type * as z from "zod";

export type Product = z.infer<typeof ProductSchema>;
export type ProductsCollection = z.infer<typeof ProductsCollectionSchema>;

export interface GetProductsParams {
  _page?: number;
  _per_page?: number;
}

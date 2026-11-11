import type {
  CategoriesSchema,
  CategorySchema,
  ProductSchema,
  ProductsCollectionSchema,
} from "./product.schemas";
import type * as z from "zod";

export type Product = z.infer<typeof ProductSchema>;
export type ProductsCollection = z.infer<typeof ProductsCollectionSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Categories = z.infer<typeof CategoriesSchema>;

export interface ProductsQueryAll {
  kind: "all";
}

export interface ProductsQueryCategory {
  kind: "category";
  slug: string;
}

export interface ProductsQuerySearch {
  kind: "search";
  q: string;
}

export type ProductsQuery
  = | ProductsQueryAll
    | ProductsQueryCategory
    | ProductsQuerySearch;

export interface ProductsPaging {
  limit: number;
  skip: number;
}

import {
  describe, expect, it,
} from "vitest";

import categoriesFixture from "../api/__fixtures__/categories.json";
import productsFixture from "../api/__fixtures__/products.json";
import {
  CategoriesSchema,
  ProductsCollectionSchema,
} from "./product.schemas";

describe("ProductsCollectionSchema", () => {
  it("accepts a DummyJSON response", () => {
    const result = ProductsCollectionSchema.safeParse(productsFixture);

    expect(result.success).toBe(true);
    expect(result.data?.products[0]?.id).toBe(1);
    expect(result.data?.total).toBe(194);
  });

  it("accepts an empty list (unknown category)", () => {
    const result = ProductsCollectionSchema.safeParse({
      limit: 0,
      products: [],
      skip: 0,
      total: 0,
    });

    expect(result.success).toBe(true);
  });

  it("rejects the json-server shape (`data` instead of `products`)", () => {
    const {
      products,
      ...rest
    } = productsFixture;
    const result = ProductsCollectionSchema.safeParse({
      ...rest,
      data: products,
    });

    expect(result.success).toBe(false);
  });

  it("rejects a bare array of products", () => {
    expect(ProductsCollectionSchema.safeParse(productsFixture.products).success)
      .toBe(false);
  });

  it("rejects a string id", () => {
    const result = ProductsCollectionSchema.safeParse({
      ...productsFixture,
      products: productsFixture.products.map((product) => ({
        ...product,
        id: String(product.id),
      })),
    });

    expect(result.success).toBe(false);
  });
});

describe("CategoriesSchema", () => {
  it("accepts a DummyJSON categories array", () => {
    const result = CategoriesSchema.safeParse(categoriesFixture);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(categoriesFixture.length);
  });

  it("rejects an object instead of an array", () => {
    expect(CategoriesSchema.safeParse({ categories: categoriesFixture }).success)
      .toBe(false);
  });

  it("rejects plain string categories", () => {
    expect(CategoriesSchema.safeParse(["beauty", "fragrances"]).success)
      .toBe(false);
  });
});

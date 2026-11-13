import {
  describe, expect, it,
} from "vitest";

import { getCategoryOptions } from "./get-category-options";

const allLabel = "All categories";
const all = {
  label: allLabel,
  value: "",
};
const beauty = {
  name: "Beauty",
  slug: "beauty",
  url: "https://example.test/beauty",
};
const laptops = {
  name: "Laptops",
  slug: "laptops",
  url: "https://example.test/laptops",
};

describe("getCategoryOptions", () => {
  it("offers only `All categories` without slug and categories", () => {
    expect(getCategoryOptions({
      allLabel,
      categories: [],
      slug: "",
    })).toEqual([all]);
  });

  it("offers the slug when no categories are loaded", () => {
    expect(getCategoryOptions({
      allLabel,
      categories: [],
      slug: "laptops",
    })).toEqual([
      all,
      {
        label: "laptops",
        value: "laptops",
      },
    ]);
  });

  it("puts an unlisted slug right after `All categories`", () => {
    expect(
      getCategoryOptions({
        allLabel,
        categories: [beauty, laptops],
        slug: "nope",
      }),
    ).toEqual([
      all,
      {
        label: "nope",
        value: "nope",
      },
      {
        label: "Beauty",
        value: "beauty",
      },
      {
        label: "Laptops",
        value: "laptops",
      },
    ]);
  });

  it("adds no extra option for a listed slug", () => {
    expect(
      getCategoryOptions({
        allLabel,
        categories: [beauty, laptops],
        slug: "laptops",
      }),
    ).toEqual([
      all,
      {
        label: "Beauty",
        value: "beauty",
      },
      {
        label: "Laptops",
        value: "laptops",
      },
    ]);
  });
});

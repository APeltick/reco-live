import {
  describe, expect, it,
} from "vitest";

import {
  getQueryCategorySlug,
  getQuerySearchText,
  parseProductsSearchParams,
  productsQueryToSearchParams,
} from "./product-url";

function parse(search: string) {
  return parseProductsSearchParams(new URLSearchParams(search));
}

describe("parseProductsSearchParams", () => {
  it("no params → all", () => {
    expect(parse("")).toEqual({
      hasConflict: false,
      query: { kind: "all" },
    });
  });

  it("q → search", () => {
    expect(parse("q=phone")).toEqual({
      hasConflict: false,
      query: {
        kind: "search",
        q: "phone",
      },
    });
  });

  it("trims q", () => {
    expect(parse("q=%20%20phone%20").query).toEqual({
      kind: "search",
      q: "phone",
    });
  });

  it.each(["q=", "q=%20", "q=%20%20%20"])("blank search (%s) → all", (search) => {
    expect(parse(search)).toEqual({
      hasConflict: false,
      query: { kind: "all" },
    });
  });

  it("category → category", () => {
    expect(parse("category=beauty")).toEqual({
      hasConflict: false,
      query: {
        kind: "category",
        slug: "beauty",
      },
    });
  });

  it("both params → category wins, conflict reported", () => {
    expect(parse("q=phone&category=beauty")).toEqual({
      hasConflict: true,
      query: {
        kind: "category",
        slug: "beauty",
      },
    });
  });

  it("empty category is ignored", () => {
    expect(parse("category=&q=phone").query).toEqual({
      kind: "search",
      q: "phone",
    });
  });

  it("category with a blank q → category, conflict (q must be removed)", () => {
    const parsed = parse("category=beauty&q=%20");

    expect(parsed.query).toEqual({
      kind: "category",
      slug: "beauty",
    });
    expect(parsed.hasConflict).toBe(true);
  });
});

describe("productsQueryToSearchParams", () => {
  it("all → no params", () => {
    expect(productsQueryToSearchParams({ kind: "all" }).toString()).toBe("");
  });

  it("search → q only", () => {
    const params = productsQueryToSearchParams({
      kind: "search",
      q: "red phone",
    });

    expect(params.get("q")).toBe("red phone");
    expect(params.has("category")).toBe(false);
  });

  it("padded search → trimmed q", () => {
    const params = productsQueryToSearchParams({
      kind: "search",
      q: " phone ",
    });

    expect(params.get("q")).toBe("phone");
  });

  it("category → category only (search cleared)", () => {
    const params = productsQueryToSearchParams({
      kind: "category",
      slug: "beauty",
    });

    expect(params.get("category")).toBe("beauty");
    expect(params.has("q")).toBe(false);
  });

  it("whitespace search → no params", () => {
    expect(
      productsQueryToSearchParams({
        kind: "search",
        q: " ".repeat(3),
      }).toString(),
    ).toBe("");
  });

  it("empty category slug → no params", () => {
    expect(
      productsQueryToSearchParams({
        kind: "category",
        slug: "",
      }).toString(),
    ).toBe("");
  });

  it("round-trips through parse", () => {
    const query = {
      kind: "category",
      slug: "home-decoration",
    } as const;

    expect(parseProductsSearchParams(productsQueryToSearchParams(query)).query)
      .toEqual(query);
  });
});

describe("query text getters", () => {
  it("getQuerySearchText", () => {
    expect(getQuerySearchText({
      kind: "search",
      q: "x",
    })).toBe("x");
    expect(getQuerySearchText({
      kind: "category",
      slug: "beauty",
    })).toBe("");
    expect(getQuerySearchText({ kind: "all" })).toBe("");
  });

  it("getQueryCategorySlug", () => {
    expect(getQueryCategorySlug({
      kind: "category",
      slug: "beauty",
    })).toBe("beauty");
    expect(getQueryCategorySlug({
      kind: "search",
      q: "x",
    })).toBe("");
    expect(getQueryCategorySlug({ kind: "all" })).toBe("");
  });
});

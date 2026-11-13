import {
  describe, expect, it,
} from "vitest";

import {
  getQueryCategorySlug,
  getQuerySearchText,
  pageToPaging,
  parseProductsSearchParams,
  productsQueryToSearchParams,
  shouldShowPagination,
} from "./product-url";

function parse(search: string) {
  return parseProductsSearchParams(new URLSearchParams(search));
}

describe("parseProductsSearchParams", () => {
  it("no params → all", () => {
    expect(parse("")).toEqual({
      hasConflict: false,
      needsReplace: false,
      page: 1,
      query: { kind: "all" },
    });
  });

  it("q → search", () => {
    expect(parse("q=phone")).toEqual({
      hasConflict: false,
      needsReplace: false,
      page: 1,
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
      needsReplace: false,
      page: 1,
      query: { kind: "all" },
    });
  });

  it("category → category", () => {
    expect(parse("category=beauty")).toEqual({
      hasConflict: false,
      needsReplace: false,
      page: 1,
      query: {
        kind: "category",
        slug: "beauty",
      },
    });
  });

  it("both params → category wins, conflict reported", () => {
    expect(parse("q=phone&category=beauty")).toEqual({
      hasConflict: true,
      needsReplace: true,
      page: 1,
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

describe("parseProductsSearchParams page", () => {
  it("absent → 1, no replace", () => {
    expect(parse("q=phone").page).toBe(1);
    expect(parse("q=phone").needsReplace).toBe(false);
  });

  it("\"3\" → 3, no replace", () => {
    expect(parse("page=3")).toMatchObject({
      page: 3,
      needsReplace: false,
    });
  });

  it.each(["0", "-1", "2.5", "abc", "02", "", "1", "99999999999999999999"])(
    "page=%j → 1 with replace",
    (value) => {
      expect(parse(`page=${value}`)).toMatchObject({
        page: 1,
        needsReplace: true,
      });
    },
  );

  it("q + category + page=2 → category, page 2, replace", () => {
    expect(parse("?q=phone&category=smartphones&page=2")).toEqual({
      hasConflict: true,
      needsReplace: true,
      page: 2,
      query: {
        kind: "category",
        slug: "smartphones",
      },
    });
  });

  it("several page params → the first one", () => {
    expect(parse("page=4&page=2").page).toBe(4);
  });
});

describe("productsQueryToSearchParams page", () => {
  it("page 1 and omitted page are not written", () => {
    expect(productsQueryToSearchParams({ kind: "all" }, 1).toString()).toBe("");
    expect(productsQueryToSearchParams({ kind: "all" }).has("page")).toBe(false);
  });

  it("page 3 is written next to q and category", () => {
    expect(
      productsQueryToSearchParams({
        kind: "search",
        q: "phone",
      }, 3).toString(),
    ).toBe("q=phone&page=3");
    expect(
      productsQueryToSearchParams({
        kind: "category",
        slug: "beauty",
      }, 3).toString(),
    ).toBe("category=beauty&page=3");
  });
});

describe("pageToPaging", () => {
  it("page 3 → skip 20", () => {
    expect(pageToPaging(3)).toEqual({
      limit: 10,
      skip: 20,
    });
  });

  it("page 1 → skip 0", () => {
    expect(pageToPaging(1)).toEqual({
      limit: 10,
      skip: 0,
    });
  });
});

describe("shouldShowPagination", () => {
  const isShown = (count: number, page: number, hasError = false) =>
    shouldShowPagination({
      count,
      page,
      hasError,
    });

  it("count 1 page 1 → hidden", () => {
    expect(isShown(1, 1)).toBe(false);
  });

  it("count 20 → shown", () => {
    expect(isShown(20, 1)).toBe(true);
  });

  it("count 20 page 99 → shown", () => {
    expect(isShown(20, 99)).toBe(true);
  });

  it("count 1 page 2 → shown", () => {
    expect(isShown(1, 2)).toBe(true);
  });

  it("count 0 page 2 → hidden", () => {
    expect(isShown(0, 2)).toBe(false);
  });

  it("error → hidden", () => {
    expect(isShown(20, 1, true)).toBe(false);
    expect(isShown(20, 99, true)).toBe(false);
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

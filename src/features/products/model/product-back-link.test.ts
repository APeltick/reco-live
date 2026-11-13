import {
  describe, expect, it,
} from "vitest";

import { createProductBackLink } from "./product-back-link";

describe("createProductBackLink", () => {
  it("keeps the catalog search", () => {
    expect(createProductBackLink("?category=laptops"))
      .toBe("/product?category=laptops");
  });

  it.each([
    ["an empty string", ""],
    ["undefined", undefined],
    ["a number", 5],
    ["a protocol-relative url", "//evil"],
    ["a path", "/x"],
  ])("falls back to /product for %s", (_name, from) => {
    expect(createProductBackLink(from)).toBe("/product");
  });
});

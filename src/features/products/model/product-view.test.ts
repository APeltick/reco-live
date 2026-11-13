import {
  describe, expect, it,
} from "vitest";

import { formatUsdPrice, getProductPhoto } from "./product-view";

describe("getProductPhoto", () => {
  it("falls back to the thumbnail when images is empty", () => {
    expect(getProductPhoto({
      images: [],
      thumbnail: "t.webp",
    })).toBe("t.webp");
  });

  it("uses the first image", () => {
    expect(getProductPhoto({
      images: ["a.webp", "b.webp"],
      thumbnail: "t.webp",
    }))
      .toBe("a.webp");
  });
});

describe("formatUsdPrice", () => {
  it.each([
    [9.99, "$9.99"],
    [10, "$10.00"],
  ])("formats %s as %s", (price, expected) => {
    expect(formatUsdPrice(price)).toBe(expected);
  });
});

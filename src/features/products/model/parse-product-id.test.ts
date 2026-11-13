import {
  describe, expect, it,
} from "vitest";

import { parseProductId } from "./parse-product-id";

describe("parseProductId", () => {
  it("accepts a positive integer", () => {
    expect(parseProductId("12")).toBe(12);
  });

  it.each([
    "0", "01", "-1", "+1", " 1", "1.5", "abc", "12abc", "", "99999999999999999999",
  ])("rejects %j", (parameter) => {
    expect(parseProductId(parameter)).toBeNull();
  });

  it("rejects an undefined param", () => {
    expect(parseProductId(undefined)).toBeNull();
  });
});

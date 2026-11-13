import {
  describe, expect, it, vi,
} from "vitest";
import { RequestError } from "~shared/api";

import productFixture from "../api/__fixtures__/product.json";
import { resolveProductDetails } from "./resolve-product-details";

const product = productFixture;

describe("resolveProductDetails", () => {
  it("returns not-found without calling getById for a bad id", async () => {
    const getById = vi.fn();

    await expect(resolveProductDetails("abc", getById))
      .resolves.toEqual({ kind: "not-found" });
    expect(getById).not.toHaveBeenCalled();
  });

  it("returns not-found for null", async () => {
    const getById = vi.fn().mockResolvedValue(null);

    await expect(resolveProductDetails("5", getById))
      .resolves.toEqual({ kind: "not-found" });
    expect(getById).toHaveBeenCalledWith(5, undefined);
  });

  it("returns the product", async () => {
    const getById = vi.fn().mockResolvedValue(product);

    await expect(resolveProductDetails("1", getById))
      .resolves.toEqual({
        kind: "product",
        product,
      });
  });

  it.each([
    ["a 500", new RequestError("500", { response: new Response("", { status: 500 }) })],
    ["a network failure", new RequestError("Network request failed.")],
    ["a wrong shape", new RequestError("bad shape", { response: new Response("{}") })],
  ])("returns error for %s", async (_name, error) => {
    const getById = vi.fn().mockRejectedValue(error);

    await expect(resolveProductDetails("1", getById))
      .resolves.toEqual({
        error,
        kind: "error",
      });
  });

  it("rethrows a plain Error", async () => {
    const error = new Error("bug");
    const getById = vi.fn().mockRejectedValue(error);

    await expect(resolveProductDetails("1", getById)).rejects.toBe(error);
  });
});

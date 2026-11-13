import {
  afterEach, beforeEach, describe, expect, it, vi,
} from "vitest";
import { RequestError } from "~shared/api";
import { sendErrorReport } from "~shared/lib/error-report";

import productFixture from "./__fixtures__/product.json";
import { getProductById } from "./get-product-by-id";

vi.mock("~shared/lib/error-report");

const fetchMock = vi.fn<typeof fetch>();

async function catchError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }

  return new Error("expected the promise to reject");
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("VITE_APP_API_URL", "https://api.example.com");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.mocked(sendErrorReport).mockReset();
});

describe("getProductById", () => {
  it("returns the parsed product for a 200", async () => {
    fetchMock.mockResolvedValue(
      Response.json(productFixture, { status: 200 }),
    );

    await expect(getProductById(1)).resolves.toEqual(productFixture);

    const [input] = fetchMock.mock.calls[0] ?? [];

    expect((input as URL).href).toBe("https://api.example.com/products/1");
  });

  it("returns null for a 404 without reporting", async () => {
    fetchMock.mockResolvedValue(
      new Response("{\"message\":\"not found\"}", { status: 404 }),
    );

    await expect(getProductById(9999)).resolves.toBeNull();
    expect(sendErrorReport).not.toHaveBeenCalled();
  });

  it("throws RequestError for a 500", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 500 }));

    expect(await catchError(getProductById(1))).toBeInstanceOf(RequestError);
  });

  it("throws RequestError for a wrong shape", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ id: "1" }, { status: 200 }),
    );

    expect(await catchError(getProductById(1))).toBeInstanceOf(RequestError);
  });
});

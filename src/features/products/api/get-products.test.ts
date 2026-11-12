import {
  afterEach, beforeEach, describe, expect, it, vi,
} from "vitest";
import { RequestError } from "~shared/api";
import { sendErrorReport } from "~shared/lib/error-report";

import categoriesFixture from "./__fixtures__/categories.json";
import productsFixture from "./__fixtures__/products.json";
import {
  createCategoriesUrl,
  createProductsUrl,
  getCategories,
  getProducts,
} from "./get-products";

vi.mock("~shared/lib/error-report");

const API_URL = "https://dummyjson.test";
const PAGING = {
  limit: 10,
  skip: 20,
};

const fetchMock = vi.fn<typeof fetch>();

function fetchedUrl(): string {
  const [input] = fetchMock.mock.calls[0] ?? [];

  return (input as URL).href;
}

function jsonResponse(body: unknown): Response {
  return Response.json(body, {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}

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
  vi.stubEnv("VITE_APP_API_URL", API_URL);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.mocked(sendErrorReport).mockReset();
});

describe("createProductsUrl", () => {
  it("all → /products with limit and skip", () => {
    expect(createProductsUrl({ kind: "all" }, PAGING))
      .toBe("/products?limit=10&skip=20");
  });

  it("search → /products/search with q, limit and skip", () => {
    expect(createProductsUrl({
      kind: "search",
      q: "phone",
    }, PAGING)).toBe("/products/search?q=phone&limit=10&skip=20");
  });

  it("encodes the search text", () => {
    const url = createProductsUrl({
      kind: "search",
      q: "a&b c/d?",
    }, PAGING);

    expect(url).toBe("/products/search?q=a%26b+c%2Fd%3F&limit=10&skip=20");
  });

  it("category → /products/category/<slug> with limit and skip, no q", () => {
    expect(createProductsUrl({
      kind: "category",
      slug: "beauty",
    }, PAGING)).toBe("/products/category/beauty?limit=10&skip=20");
  });

  it("encodes the category slug in the path", () => {
    const url = createProductsUrl({
      kind: "category",
      slug: "a/b c",
    }, PAGING);

    expect(url).toBe("/products/category/a%2Fb%20c?limit=10&skip=20");
  });
});

describe("createCategoriesUrl", () => {
  it("points at /products/categories", () => {
    expect(createCategoriesUrl()).toBe("/products/categories");
  });
});

describe("getProducts", () => {
  it("returns the data of a valid response and requests the built URL", async () => {
    fetchMock.mockResolvedValue(jsonResponse(productsFixture));

    const data = await getProducts({ kind: "all" }, PAGING);

    // zod strips fields the schema does not know (`brand`), so compare what it keeps
    expect(data.total).toBe(productsFixture.total);
    expect(data.products.map((product) => product.id))
      .toEqual(productsFixture.products.map((product) => product.id));
    expect(fetchedUrl()).toBe(`${API_URL}/products?limit=10&skip=20`);
  });

  it("throws RequestError for a response of another shape", async () => {
    const {
      products,
      ...rest
    } = productsFixture;
    fetchMock.mockResolvedValue(jsonResponse({
      ...rest,
      data: products,
    }));

    const error = await catchError(getProducts({ kind: "all" }, PAGING));

    expect(error).toBeInstanceOf(RequestError);
  });

  it("throws RequestError when the id is a string", async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      ...productsFixture,
      products: productsFixture.products.map((product) => ({
        ...product,
        id: String(product.id),
      })),
    }));

    const error = await catchError(getProducts({ kind: "all" }, PAGING));

    expect(error).toBeInstanceOf(RequestError);
  });

  it("throws RequestError for a body that is not JSON", async () => {
    fetchMock.mockResolvedValue(new Response("<html>", { status: 200 }));

    const error = await catchError(getProducts({ kind: "all" }, PAGING));

    expect(error).toBeInstanceOf(RequestError);
  });
});

describe("getCategories", () => {
  it("returns the data of a valid response", async () => {
    fetchMock.mockResolvedValue(jsonResponse(categoriesFixture));

    const data = await getCategories();

    expect(data).toEqual(categoriesFixture);
    expect(fetchedUrl()).toBe(`${API_URL}/products/categories`);
  });

  it("throws RequestError for a response of another shape", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ categories: categoriesFixture }));

    const error = await catchError(getCategories());

    expect(error).toBeInstanceOf(RequestError);
  });
});

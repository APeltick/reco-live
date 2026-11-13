import {
  afterEach, beforeEach, describe, expect, it, vi,
} from "vitest";
import {
  isNetworkError, request, RequestError,
} from "~shared/api/request";
import { sendErrorReport } from "~shared/lib/error-report";

vi.mock("~shared/lib/error-report");

const API_URL = "https://api.example.com/v1";

const fetchMock = vi.fn<typeof fetch>();

function fetchedUrl(): string {
  const [input] = fetchMock.mock.calls[0] ?? [];

  return (input as URL).href;
}

function fetchedInit(): RequestInit {
  return fetchMock.mock.calls[0]?.[1] ?? {};
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
  fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("VITE_APP_API_URL", API_URL);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.mocked(sendErrorReport).mockReset();
});

describe("request", () => {
  it("returns a 2xx response", async () => {
    const response = new Response("{}", { status: 200 });
    fetchMock.mockResolvedValue(response);

    await expect(request({ url: "/items" })).resolves.toBe(response);
    expect(sendErrorReport).not.toHaveBeenCalled();
  });

  it.each([
    ["no slashes", "https://api.example.com/v1", "items"],
    ["trailing slash on the API URL", "https://api.example.com/v1/", "items"],
    ["leading slash on the path", "https://api.example.com/v1", "/items"],
    ["both slashes", "https://api.example.com/v1/", "/items"],
  ])("joins the API URL and the path with %s", async (_name, base, path) => {
    vi.stubEnv("VITE_APP_API_URL", base);

    await request({ url: path });

    expect(fetchedUrl()).toBe("https://api.example.com/v1/items");
  });

  it("sends the body as JSON", async () => {
    const body = {
      name: "tea",
      tags: ["a", "b"],
    };

    await request({
      body,
      method: "POST",
      url: "/items",
    });

    expect(fetchedInit().body).toBe(JSON.stringify(body));
    expect(fetchedInit().method).toBe("POST");
  });

  it("sends no body when none is given", async () => {
    await request({ url: "/items" });

    expect(fetchedInit()).not.toHaveProperty("body");
  });

  it("sets the Bearer authorization header", async () => {
    await request({
      authorization: "token-1",
      url: "/items",
    });

    const headers = new Headers(fetchedInit().headers);

    expect(headers.get("authorization")).toBe("Bearer token-1");
  });

  it("throws RequestError and reports a network failure when fetch rejects", async () => {
    const cause = new TypeError("fetch failed");
    fetchMock.mockRejectedValue(cause);

    const error = await catchError(request({ url: "/items" }));

    expect(error).toBeInstanceOf(RequestError);
    expect((error as RequestError).message).toBe("Network request failed.");
    expect((error as RequestError).cause).toBe(cause);
    expect((error as RequestError).isNetworkError).toBe(true);
    expect(isNetworkError(error)).toBe(true);
    expect(sendErrorReport).toHaveBeenCalledTimes(1);
    expect(sendErrorReport).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "network",
        method: "GET",
        pathname: "/v1/items",
      }),
    );
  });

  it("rethrows the original error without a report when the signal is aborted", async () => {
    const controller = new AbortController();
    const abortError = new DOMException("Aborted", "AbortError");
    controller.abort();
    fetchMock.mockRejectedValue(abortError);

    const error = await catchError(
      request({
        signal: controller.signal,
        url: "/items",
      }),
    );

    expect(error).toBe(abortError);
    expect(error).not.toBeInstanceOf(RequestError);
    expect(isNetworkError(error)).toBe(false);
    expect(sendErrorReport).not.toHaveBeenCalled();
  });

  it("throws RequestError with the response and reports a non-2xx status", async () => {
    const response = new Response("nope", {
      status: 404,
      statusText: "Not Found",
    });
    fetchMock.mockResolvedValue(response);

    const error = await catchError(request({ url: "/items" }));

    expect(error).toBeInstanceOf(RequestError);
    expect((error as RequestError).response).toBe(response);
    expect((error as RequestError).isNetworkError).toBe(false);
    expect(isNetworkError(error)).toBe(false);
    expect(sendErrorReport).toHaveBeenCalledTimes(1);
    expect(sendErrorReport).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "http",
        method: "GET",
        pathname: "/v1/items",
        status: 404,
      }),
    );
  });

  it("returns a non-2xx response whose status is allowed", async () => {
    const response = new Response("nope", { status: 404 });
    fetchMock.mockResolvedValue(response);

    await expect(
      request({
        allowedStatusCodes: [404],
        url: "/items",
      }),
    ).resolves.toBe(response);
    expect(sendErrorReport).not.toHaveBeenCalled();
  });

  it("still throws for a status that is not in allowedStatusCodes", async () => {
    fetchMock.mockResolvedValue(new Response("nope", { status: 500 }));

    const error = await catchError(
      request({
        allowedStatusCodes: [404],
        url: "/items",
      }),
    );

    expect(error).toBeInstanceOf(RequestError);
  });

  it.each(["", " ".repeat(3)])(
    "throws when the API URL is empty (%j)",
    async (value) => {
      vi.stubEnv("VITE_APP_API_URL", value);

      const error = await catchError(request({ url: "/items" }));

      expect(error).toBeInstanceOf(RequestError);
      expect((error as RequestError).message).toBe(
        "API URL is not configured.",
      );
      expect((error as RequestError).isNetworkError).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("isNetworkError is false for a plain Error and non-errors", () => {
    expect(isNetworkError(new Error("plain"))).toBe(false);
    expect(isNetworkError("fetch failed")).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
  });

  it("ignores the API URL for an absolute URL", async () => {
    vi.stubEnv("VITE_APP_API_URL", "");

    await request({ url: "https://other.example.org/path?q=1" });

    expect(fetchedUrl()).toBe("https://other.example.org/path?q=1");
  });
});

describe("request domain override", () => {
  it.each([
    ["without a trailing slash", "https://other.example.org/api"],
    ["with a trailing slash", "https://other.example.org/api/"],
  ])("sends the request to the domain %s instead of the API URL", async (_name, domain) => {
    await request({
      domain,
      url: "/items",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchedUrl()).toBe("https://other.example.org/api/items");
    expect(fetchedUrl()).not.toContain("api.example.com");
  });

  it("uses the domain even when the API URL is not configured", async () => {
    vi.stubEnv("VITE_APP_API_URL", "");

    await request({
      domain: "https://other.example.org/api",
      url: "items",
    });

    expect(fetchedUrl()).toBe("https://other.example.org/api/items");
  });
});

describe("request when the error report fails", () => {
  beforeEach(() => {
    vi.mocked(sendErrorReport).mockImplementation(() => {
      throw new Error("report transport failed");
    });
  });

  it("still throws the original RequestError on a network failure", async () => {
    const cause = new TypeError("fetch failed");
    fetchMock.mockRejectedValue(cause);

    const error = await catchError(request({ url: "/items" }));

    expect(sendErrorReport).toHaveBeenCalledTimes(1);
    expect(error).toBeInstanceOf(RequestError);
    expect((error as RequestError).message).toBe("Network request failed.");
    expect((error as RequestError).cause).toBe(cause);
    expect((error as RequestError).response).toBeUndefined();
  });

  it("still throws the original RequestError with the response on a non-2xx status", async () => {
    const response = new Response("nope", { status: 500 });
    fetchMock.mockResolvedValue(response);

    const error = await catchError(request({ url: "/items" }));

    expect(sendErrorReport).toHaveBeenCalledTimes(1);
    expect(error).toBeInstanceOf(RequestError);
    expect((error as RequestError).message).toBe(
      "Request failed with status 500.",
    );
    expect((error as RequestError).response).toBe(response);
    expect((error as RequestError).cause).toBeUndefined();
  });
});

describe("request with a body that cannot be serialized", () => {
  const circular: Record<string, unknown> = {};
  circular["self"] = circular;

  it.each([
    ["a BigInt value", { amount: 1n }],
    ["a circular object", circular],
  ])("throws RequestError with a cause and does not call fetch for %s", async (_name, body) => {
    const error = await catchError(
      request({
        body,
        method: "POST",
        url: "/items",
      }),
    );

    expect(error).toBeInstanceOf(RequestError);
    expect((error as RequestError).message).toBe(
      "Request body cannot be serialized as JSON.",
    );
    expect((error as RequestError).cause).toBeInstanceOf(TypeError);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendErrorReport).not.toHaveBeenCalled();
  });
});

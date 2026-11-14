import type {
  BrowserContext, Page, Request, Route,
} from "@playwright/test";

import { readFileSync } from "node:fs";
import { join } from "node:path";

const FIXTURES_DIR = import.meta.dirname;
const API_HOST = "dummyjson.com";
const CDN_HOST = "cdn.dummyjson.com";
const PAGE_SIZE = "10";
const ABORTED_ERROR = "net::ERR_ABORTED";
// Playwright throws these when a route is fulfilled after the page aborted the request
// (or the page is already gone); nothing else is swallowed.
const ALREADY_GONE_ERROR = /already handled|cancel|abort|closed|disposed/i;

const CORS_HEADERS = { "access-control-allow-origin": "*" };

function readText(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), "utf8");
}

function readJson(name: string): unknown {
  return JSON.parse(readText(name));
}

export interface DummyJsonOverrides {
  categories?: unknown;
  product?: unknown;
  products?: unknown;
}

export interface DummyJsonHold {
  /** Resolves when the browser has sent the parked request. */
  arrived: Promise<void>;
  /**
   * `"aborted"` when the page aborted the parked request, or when the stub aborted it on
   * release because it has no fixture (recorded as a violation); `"fulfilled"` once the
   * released response finished.
   */
  outcome: Promise<"aborted" | "fulfilled">;
  /** Answers the parked request (call after `arrived`); an already aborted request is ignored. */
  release: () => Promise<void>;
}

/**
 * What a test gets from the `dummyJson` fixture.
 *
 * - `requests`: every DummyJSON API GET the browser sent, in order, as `path + search`
 *   (e.g. `/products/search?q=phone&limit=10&skip=0`) - also those answered by the
 *   empty default and those aborted later by the page.
 * - `violations`: requests the stub did not expect (`unmatched: <url>` for DummyJSON
 *   without a fixture, `blocked: <url>` for any other origin); the fixture fails the test
 *   when it is not empty.
 * - `hold(match)`: `match` is a `path + search` string or a predicate on it; parks only the
 *   FIRST matching request until `release()`, later matches are answered at once. A held
 *   request with no fixture is recorded as a violation and aborted on `release()` (like an
 *   unheld one), `outcome` resolves `"aborted"`.
 * - `fail(match, failure)`: `match` as in `hold`; fails only the FIRST matching request, later
 *   ones get the normal answer (a retry can succeed). `failure` is `{ status }` (that status,
 *   an empty JSON body and the stub's CORS headers, so `fetch` resolves and the app sees the
 *   status) or `"network"` (`route.abort("internetdisconnected")`: `fetch` rejects, the app
 *   shows "No connection"). Checked before the routing and before `hold`, so any DummyJSON
 *   path can fail (with or without a fixture), and `fail` + `hold` on one path fail the first
 *   request and hold the second. The failed request is logged in `requests`, not a violation.
 *   Returns a promise that resolves once the failure was served (do not await it before
 *   triggering the request).
 * - Clearing `violations` (`violations.length = 0`) is allowed for a test that checks the
 *   guard itself (`stub-guard.spec.ts`); otherwise the fixture fails the test at teardown.
 */
export interface DummyJsonHandle {
  fail: (match: HoldMatch, failure: DummyJsonFailure) => Promise<void>;
  hold: (match: HoldMatch) => DummyJsonHold;
  readonly requests: string[];
  readonly violations: string[];
}

export type DummyJsonFailure = "network" | { status: number };

export type HoldMatch = string | ((pathAndSearch: string) => boolean);

interface MockOptions {
  /** The app's base URL: its origin is the only one besides DummyJSON/CDN let through. */
  baseURL?: string | undefined;
}

interface PendingFail {
  failure: DummyJsonFailure;
  isTaken: boolean;
  match: (pathAndSearch: string) => boolean;
  served: () => void;
}

interface PendingHold {
  arrive: () => void;
  gate: Promise<void>;
  isTaken: boolean;
  match: (pathAndSearch: string) => boolean;
  open: () => void;
  outcome: (value: "aborted" | "fulfilled") => void;
  settled: () => void;
}

/**
 * Serves every DummyJSON request of the page's browser context from local fixtures and
 * records what it did not expect. See `DummyJsonHandle`.
 * Registers a catch-all guard FIRST (later routes win in Playwright), so only the base URL
 * origin passes untouched, DummyJSON/CDN go to the stub and everything else is aborted
 * and recorded.
 */
export async function mockDummyJson(
  page: Page,
  overrides: DummyJsonOverrides = {},
  options: MockOptions = {},
): Promise<DummyJsonHandle> {
  const context = page.context();
  const fixtures: Fixtures = {
    categories: overrides.categories ?? readJson("categories.json"),
    product: overrides.product ?? readJson("product.json"),
    products: overrides.products ?? readJson("products.json"),
    productsPage2: readJson("products-page-2.json"),
  };
  const image = readText("image.svg");
  const baseOrigin = options.baseURL === undefined ? undefined : new URL(options.baseURL).origin;
  const requests: string[] = [];
  const violations: string[] = [];
  const holds: PendingHold[] = [];
  const fails: PendingFail[] = [];

  await context.route("**/*", async (route) => {
    const url = route.request().url();

    if (baseOrigin !== undefined && new URL(url).origin === baseOrigin) {
      await route.continue();

      return;
    }

    violations.push(`blocked: ${url}`);
    await route.abort();
  });

  await context.route(`https://${CDN_HOST}/**`, async (route) => {
    await route.fulfill({
      body: image,
      contentType: "image/svg+xml",
      headers: CORS_HEADERS,
    });
  });

  await context.route(`https://${API_HOST}/**`, async (route) => {
    const request = route.request();

    if (request.method() === "OPTIONS") {
      await route.fulfill({
        headers: {
          ...CORS_HEADERS,
          "access-control-allow-headers": "*",
          "access-control-allow-methods": "GET, OPTIONS",
        },
        status: 204,
      });

      return;
    }

    const url = new URL(request.url());
    const pathAndSearch = `${url.pathname}${url.search}`;

    if (request.method() !== "GET") {
      violations.push(`unmatched: ${request.method()} ${request.url()}`);
      await route.abort();

      return;
    }

    requests.push(pathAndSearch);

    const failing = fails.find((candidate) => !candidate.isTaken && candidate.match(pathAndSearch));

    if (failing !== undefined) {
      failing.isTaken = true;
      await serveFailure(route, failing.failure);
      failing.served();

      return;
    }

    const hold = holds.find((candidate) => !candidate.isTaken && candidate.match(pathAndSearch));

    if (hold !== undefined) {
      hold.isTaken = true;
      await park(context, route, hold, () => pickBody(url, fixtures), violations);

      return;
    }

    const body = pickBody(url, fixtures);

    if (body === undefined) {
      violations.push(`unmatched: ${request.url()}`);
      await route.abort();

      return;
    }

    await route.fulfill({
      headers: CORS_HEADERS,
      json: body,
    });
  });

  function fail(match: HoldMatch, failure: DummyJsonFailure): Promise<void> {
    return new Promise<void>((resolve) => {
      fails.push({
        failure,
        isTaken: false,
        match: toMatcher(match),
        served: resolve,
      });
    });
  }

  function hold(match: HoldMatch): DummyJsonHold {
    const pending = createPendingHold(toMatcher(match));

    holds.push(pending);

    return {
      arrived: pending.arrivedPromise,
      outcome: pending.outcomePromise,
      release: async () => {
        pending.open();
        await pending.settledPromise;
      },
    };
  }

  return {
    fail,
    hold,
    requests,
    violations,
  };
}

function toMatcher(match: HoldMatch): (pathAndSearch: string) => boolean {
  return typeof match === "string" ? (pathAndSearch) => pathAndSearch === match : match;
}

async function serveFailure(route: Route, failure: DummyJsonFailure): Promise<void> {
  if (failure === "network") {
    await route.abort("internetdisconnected");

    return;
  }

  await route.fulfill({
    headers: CORS_HEADERS,
    json: {},
    status: failure.status,
  });
}

type PendingHoldWithPromises = PendingHold & {
  arrivedPromise: Promise<void>;
  outcomePromise: Promise<"aborted" | "fulfilled">;
  settledPromise: Promise<void>;
};

function createPendingHold(match: (pathAndSearch: string) => boolean): PendingHoldWithPromises {
  let arrive!: () => void;
  let open!: () => void;
  let outcome!: (value: "aborted" | "fulfilled") => void;
  let settled!: () => void;
  const arrivedPromise = new Promise<void>((resolve) => {
    arrive = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    open = resolve;
  });
  const outcomePromise = new Promise<"aborted" | "fulfilled">((resolve) => {
    outcome = resolve;
  });
  const settledPromise = new Promise<void>((resolve) => {
    settled = resolve;
  });

  return {
    arrive,
    arrivedPromise,
    gate,
    isTaken: false,
    match,
    open,
    outcome,
    outcomePromise,
    settled,
    settledPromise,
  };
}

async function park(
  context: BrowserContext,
  route: Route,
  hold: PendingHold,
  pickBodyForRoute: () => unknown,
  violations: string[],
): Promise<void> {
  const request = route.request();
  const state = { isAborted: false };
  const onFailed = (failed: Request) => {
    if (failed === request && failed.failure()?.errorText === ABORTED_ERROR) {
      state.isAborted = true;
      hold.outcome("aborted");
    }
  };

  context.on("requestfailed", onFailed);
  hold.arrive();
  await hold.gate;

  try {
    if (!state.isAborted) {
      const body = pickBodyForRoute();

      if (body === undefined) {
        violations.push(`unmatched: ${request.url()}`);
        await route.abort();
        hold.outcome("aborted");

        return;
      }

      await route.fulfill({
        headers: CORS_HEADERS,
        json: body,
      });
      const response = await request.response();

      await response?.finished();
      hold.outcome("fulfilled");
    }
  } catch (error) {
    // The page aborted the request while it was parked: nothing to answer.
    // `outcome` resolves "aborted" by the `requestfailed` event.
    if (!(error instanceof Error && ALREADY_GONE_ERROR.test(error.message))) {
      throw error;
    }
  } finally {
    context.off("requestfailed", onFailed);
    hold.settled();
  }
}

interface Fixtures {
  categories: unknown;
  product: unknown;
  products: unknown;
  productsPage2: unknown;
}

const EMPTY_RESULT = {
  limit: 10,
  products: [],
  skip: 0,
  total: 0,
};

const SEARCHES: Partial<Record<string, string>> = {
  mac: "search-mac.json",
  phone: "search-phone.json",
};

const CATEGORIES: Partial<Record<string, string>> = {
  laptops: "category-laptops.json",
  smartphones: "category-smartphones.json",
};

/** `undefined` = no fixture for this request (reported as unmatched). */
function pickBody(url: URL, fixtures: Fixtures): unknown {
  const { pathname, searchParams } = url;

  if (pathname === "/products/categories") {
    return fixtures.categories;
  }

  if (pathname === `/products/${String((fixtures.product as { id: number }).id)}`) {
    return fixtures.product;
  }

  if (searchParams.get("limit") !== PAGE_SIZE) {
    return undefined;
  }

  const skip = searchParams.get("skip");

  if (pathname === "/products") {
    if (skip === "0") {
      return fixtures.products;
    }

    return skip === "10" ? fixtures.productsPage2 : undefined;
  }

  if (pathname === "/products/search") {
    const file = SEARCHES[searchParams.get("q") ?? ""];

    if (file === undefined) {
      return EMPTY_RESULT;
    }

    return skip === "0" ? readJson(file) : undefined;
  }

  const categoryPrefix = "/products/category/";

  if (pathname.startsWith(categoryPrefix)) {
    const file = CATEGORIES[decodeURIComponent(pathname.slice(categoryPrefix.length))];

    if (file === undefined) {
      return EMPTY_RESULT;
    }

    return skip === "0" ? readJson(file) : undefined;
  }

  return undefined;
}

import type { Page, Route } from "@playwright/test";

import { readFileSync } from "node:fs";
import { join } from "node:path";

const FIXTURES_DIR = import.meta.dirname;
const API_HOST = "dummyjson.com";
const CDN_HOST = "cdn.dummyjson.com";

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

/**
 * Serves every DummyJSON request of the page from local fixtures.
 * A request to DummyJSON without a fixture is aborted, so a missing stub fails loudly.
 * Requests to any other host (the preview server itself) are not touched.
 */
export async function mockDummyJson(
  page: Page,
  overrides: DummyJsonOverrides = {},
): Promise<void> {
  const categories = overrides.categories ?? readJson("categories.json");
  const product = overrides.product ?? readJson("product.json");
  const products = overrides.products ?? readJson("products.json");
  const productId = (product as { id: number }).id;
  const image = readText("image.svg");

  await page.route(`https://${CDN_HOST}/**`, async (route) => {
    await route.fulfill({
      body: image,
      contentType: "image/svg+xml",
      headers: CORS_HEADERS,
    });
  });

  await page.route(`https://${API_HOST}/**`, async (route) => {
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

    const body = request.method() === "GET"
      ? pickBody(new URL(request.url()).pathname, {
          categories,
          product,
          productId,
          products,
        })
      : undefined;

    await respond(route, body);
  });
}

interface Bodies {
  categories: unknown;
  product: unknown;
  productId: number;
  products: unknown;
}

function pickBody(pathname: string, bodies: Bodies): unknown {
  if (pathname === "/products") {
    return bodies.products;
  }

  if (pathname === "/products/categories") {
    return bodies.categories;
  }

  if (pathname === `/products/${String(bodies.productId)}`) {
    return bodies.product;
  }

  return undefined;
}

async function respond(route: Route, body: unknown): Promise<void> {
  if (body === undefined) {
    await route.abort();

    return;
  }

  await route.fulfill({
    headers: CORS_HEADERS,
    json: body,
  });
}

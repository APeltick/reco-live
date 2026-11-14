import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures/test.ts";

const PRODUCT_TITLE = "Essence Mascara Lash Princess";
const PRODUCT_PRICE = "$9.99";
const PRODUCT_DESCRIPTION = "The Essence Mascara Lash Princess is a popular mascara known for its volumizing and lengthening effects.";
const PRODUCT_REQUEST = "/products/1";
const NOT_FOUND_TITLE = "Page not found";
const LOAD_ERROR_TEXT = "Could not load the product.";
const NETWORK_ERROR_TEXT = "No connection to the server. Check your internet connection and try again.";
const HTTP_NOT_FOUND = 404;
const HTTP_SERVER_ERROR = 500;

function productHeading(page: Page) {
  return page.getByRole("heading", {
    level: 1,
    name: PRODUCT_TITLE,
  });
}

function backLink(page: Page) {
  return page.getByRole("link", { name: "Back to products" });
}

function tryAgainButton(page: Page) {
  return page.getByRole("button", { name: "Try again" });
}

async function expectNotFoundPage(page: Page) {
  await expect(page.getByRole("heading", {
    level: 1,
    name: NOT_FOUND_TITLE,
  })).toBeVisible();
}

async function setNoReloadMarker(page: Page) {
  await page.evaluate(() => {
    (globalThis as unknown as { __noReload?: boolean }).__noReload = true;
  });
}

test.describe("product details", () => {
  test("direct open and back", async ({ page }) => {
    await page.goto("/products/1");

    await test.step("the page shows the product", async () => {
      await expect(page.getByRole("img", { name: PRODUCT_TITLE })).toBeVisible();
      await expect(productHeading(page)).toBeVisible();
      await expect(page.getByText(PRODUCT_PRICE)).toBeVisible();
      await expect(page.getByText(PRODUCT_DESCRIPTION)).toBeVisible();
    });

    await test.step("Back to products opens the plain catalog", async () => {
      await backLink(page).click();

      await expect(page).toHaveURL(/\/product$/);
      await expect(page.getByLabel("Search products")).toHaveValue("");
      await expect(page.getByRole("combobox", { name: "Category" })).toHaveText("All categories");
    });
  });

  test("id is not a number", async ({ dummyJson, page }) => {
    await page.goto("/products/abc");

    await test.step("the not-found page is shown", async () => {
      await expectNotFoundPage(page);
    });

    await test.step("no product request was sent", () => {
      expect(dummyJson.requests.filter((request) => request.startsWith("/products/"))).toEqual([]);
    });
  });

  test("product does not exist", async ({ dummyJson, page }) => {
    const served = dummyJson.fail("/products/9999", { status: HTTP_NOT_FOUND });

    await page.goto("/products/9999");

    await test.step("the not-found page is shown", async () => {
      await expectNotFoundPage(page);
      await served;
    });
  });

  test("loading on a direct open", async ({ dummyJson, page }) => {
    const product = dummyJson.hold(PRODUCT_REQUEST);

    await page.goto("/products/1", { waitUntil: "commit" });
    await product.arrived;

    await test.step("a loader is shown, not a blank screen", async () => {
      await expect(page.getByRole("progressbar")).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(0);
      await expect(backLink(page)).toHaveCount(0);
    });

    await test.step("after the response the product replaces the loader", async () => {
      await product.release();

      await expect(productHeading(page)).toBeVisible();
      await expect(page.getByRole("progressbar")).toHaveCount(0);
    });
  });

  test("loading after a click in the catalog", async ({ dummyJson, page }) => {
    const product = dummyJson.hold(PRODUCT_REQUEST);

    await page.goto("/product");
    await expect(page.getByText("194 products found")).toBeVisible();

    await test.step("the layout loader is shown, the list stays", async () => {
      await page.getByRole("link", { name: PRODUCT_TITLE }).click();
      await product.arrived;

      await expect(page.getByRole("progressbar", { name: "Loading page" })).toBeVisible();
      await expect(page.getByRole("link", { name: PRODUCT_TITLE })).toBeVisible();
      await expect(page).toHaveURL(/\/product$/);
    });

    await test.step("after the response the details page is shown", async () => {
      await product.release();

      await expect(page).toHaveURL(/\/products\/1$/);
      await expect(productHeading(page)).toBeVisible();
      await expect(page.getByRole("progressbar", { name: "Loading page" })).toHaveCount(0);
    });
  });

  test("request fails", async ({ dummyJson, page }) => {
    const served = dummyJson.fail(PRODUCT_REQUEST, { status: HTTP_SERVER_ERROR });

    await page.goto("/products/1");
    await served;

    await expect(page.getByRole("alert")).toHaveText(new RegExp(LOAD_ERROR_TEXT));
    await expect(tryAgainButton(page)).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(0);
  });

  test("no connection", async ({ dummyJson, page }) => {
    const served = dummyJson.fail(PRODUCT_REQUEST, "network");

    await page.goto("/products/1");
    await served;

    await expect(page.getByRole("alert")).toHaveText(new RegExp(NETWORK_ERROR_TEXT));
    await expect(tryAgainButton(page)).toBeVisible();
  });

  test("retry", async ({ dummyJson, page }) => {
    const served = dummyJson.fail(PRODUCT_REQUEST, { status: HTTP_SERVER_ERROR });
    const retry = dummyJson.hold(PRODUCT_REQUEST);

    await page.goto("/products/1");
    await served;
    await expect(page.getByRole("alert")).toHaveText(new RegExp(LOAD_ERROR_TEXT));
    await setNoReloadMarker(page);

    await test.step("Try again shows the loader while the request is parked", async () => {
      await tryAgainButton(page).click();
      await retry.arrived;

      await expect(page.getByRole("progressbar")).toBeVisible();
    });

    await test.step("the product replaces the alert without a reload", async () => {
      await retry.release();

      await expect(productHeading(page)).toBeVisible();
      await expect(page.getByRole("alert")).toHaveCount(0);
      expect(await page.evaluate(
        () => (globalThis as unknown as { __noReload?: boolean }).__noReload,
      )).toBe(true);
    });
  });
});

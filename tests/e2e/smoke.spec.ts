import { expect, test } from "@playwright/test";

import { mockDummyJson } from "./fixtures/mock-dummy-json.ts";

test("@smoke catalog list opens a product and goes back", async ({ page }) => {
  await mockDummyJson(page);

  await test.step("the list shows 10 products and the total", async () => {
    await page.goto("/product");

    await expect(page.getByText("194 products found")).toBeVisible();
    await expect(page.locator("a[href^='/products/']")).toHaveCount(10);
  });

  await test.step("the first title opens the product page", async () => {
    await page.getByRole("link", { name: "Essence Mascara Lash Princess" }).click();

    await expect(page).toHaveURL(/\/products\/1$/);
    await expect(
      page.getByRole("heading", { name: "Essence Mascara Lash Princess" }),
    ).toBeVisible();
    await expect(page.getByText("$9.99")).toBeVisible();
  });

  await test.step("Back to products returns to the list", async () => {
    await page.getByRole("link", { name: "Back to products" }).click();

    await expect(page).toHaveURL(/\/product$/);
    await expect(page.getByText("194 products found")).toBeVisible();
    await expect(page.getByRole("link", { name: "Essence Mascara Lash Princess" })).toBeVisible();
  });
});

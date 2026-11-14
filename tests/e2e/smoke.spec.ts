import { expect, test } from "./fixtures/test.ts";

test("@smoke catalog list opens a product and goes back", async ({ page }) => {
  await test.step("the list shows 10 products and the total", async () => {
    await page.goto("/product");

    await expect(page.getByText("194 products found")).toBeVisible();
    await expect(page.getByRole("link")).toHaveCount(10);
  });

  await test.step("the categories request is served: Category offers the stubbed names", async () => {
    await page.getByRole("combobox", { name: "Category" }).click();

    await expect(page.getByRole("option", { name: "All categories" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Laptops" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Smartphones" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toBeHidden();
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

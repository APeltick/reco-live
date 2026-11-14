import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures/test.ts";

const T0 = new Date("2030-01-01T10:00:00Z").getTime();
const PAUSE_AHEAD_MS = 60_000;
const KEY_STEP_MS = 50;
const SETTLE_MS = 1000;
// Keyboard path from `All categories` down to `Laptops` in categories.json
// (Beauty, Fragrances, Furniture, Laptops).
const ARROWS_TO_LAPTOPS = 4;

const PHONE_SEARCH_REQUEST = "/products/search?q=phone&limit=10&skip=0";

const PHONE_TITLES = ["Search Phone Alpha", "Search Phone Beta", "Search Phone Gamma"];
const MAC_TITLES = ["Search Mac Pro Book", "Search Mac Air Book"];
const LAPTOP_TITLES = [
  "Category Laptop One",
  "Category Laptop Two",
  "Category Laptop Three",
  "Category Laptop Four",
  "Category Laptop Five",
];
const FIRST_PAGE_TITLES = ["Essence Mascara Lash Princess", "Red Lipstick", "Gucci Bloom Eau de"];
const SECOND_PAGE_TITLES = ["Page Two Lamp", "Page Two Desk", "Page Two Mirror"];

function searchField(page: Page) {
  return page.getByLabel("Search products");
}

function categoryField(page: Page) {
  return page.getByRole("combobox", { name: "Category" });
}

async function expectTitles(page: Page, titles: string[]) {
  for (const title of titles) {
    await expect(page.getByRole("link", { name: title })).toBeVisible();
  }
}

async function expectNoTitles(page: Page, titles: string[]) {
  for (const title of titles) {
    await expect(page.getByRole("link", { name: title })).toHaveCount(0);
  }
}

async function chooseCategory(page: Page, name: string) {
  await categoryField(page).click();
  await page.getByRole("option", { name }).click();
}

test.describe("catalog", () => {
  test("search after the pause sends one request", async ({ dummyJson, page }) => {
    await page.clock.install({ time: T0 });

    await test.step("the first list is shown, then fake time is paused", async () => {
      await page.goto("/product");
      await expect(page.getByText("194 products found")).toBeVisible();
      await page.clock.pauseAt(T0 + PAUSE_AHEAD_MS);
    });

    await test.step("typing key by key, 50 ms of fake time after each key", async () => {
      await searchField(page).click();

      for (const key of "phone") {
        await page.keyboard.press(key);
        await page.clock.runFor(KEY_STEP_MS);
      }
    });

    await test.step("after the pause the phone results and total are shown", async () => {
      await page.clock.runFor(SETTLE_MS);

      await expect(page.getByText("3 products found")).toBeVisible();
      await expectTitles(page, PHONE_TITLES);
      await expect(page).toHaveURL(/\/product\?q=phone$/);
    });

    await test.step("exactly one search request was sent", () => {
      expect(dummyJson.requests.filter((request) => request.startsWith("/products/search")))
        .toEqual(["/products/search?q=phone&limit=10&skip=0"]);
    });
  });

  test("category clears search, Back restores it", async ({ page }) => {
    await page.clock.install();

    await test.step("search phone", async () => {
      await page.goto("/product");
      await expect(page.getByText("194 products found")).toBeVisible();

      await searchField(page).fill("phone");
      await page.clock.runFor(SETTLE_MS);

      await expect(page).toHaveURL(/\/product\?q=phone$/);
      await expectTitles(page, PHONE_TITLES);
    });

    await test.step("choosing Laptops clears the field", async () => {
      await chooseCategory(page, "Laptops");

      // `runFor` fires every timer in one synchronous pass. Let React commit the new URL
      // and flush its effects first (the laptops rendered), so the skip rule reads the
      // URL the page has now, not the previous `q=phone`.
      await expect(searchField(page)).toHaveValue("");
      await expectTitles(page, LAPTOP_TITLES);

      // Well over the debounce: the pending debounced "" has fired, the skip rule decides.
      await page.clock.runFor(SETTLE_MS);

      await expect(searchField(page)).toHaveValue("");
      await expect(page).toHaveURL(/\/product\?category=laptops$/);
      await expectTitles(page, LAPTOP_TITLES);
    });

    await test.step("Back restores the search", async () => {
      await page.goBack();

      await expect(page).toHaveURL(/\/product\?q=phone$/);
      await expect(searchField(page)).toHaveValue("phone");
      await expect(categoryField(page)).toHaveText("All categories");
      await expectTitles(page, PHONE_TITLES);
    });
  });

  test("search and category by keyboard only", async ({ page }) => {
    await page.goto("/product");
    await expect(page.getByText("194 products found")).toBeVisible();

    await test.step("Tab reaches the search field, type phone", async () => {
      await page.keyboard.press("Tab");
      await expect(searchField(page)).toBeFocused();

      await page.keyboard.type("phone");

      await expect(page.getByText("3 products found")).toBeVisible();
      await expectTitles(page, PHONE_TITLES);
    });

    await test.step("Tab reaches Category, arrows and Enter choose Laptops", async () => {
      await page.keyboard.press("Tab");
      await expect(categoryField(page)).toBeFocused();

      await page.keyboard.press("ArrowDown");
      await expect(page.getByRole("listbox")).toBeVisible();

      for (let step = 0; step < ARROWS_TO_LAPTOPS; step += 1) {
        await page.keyboard.press("ArrowDown");
      }

      await expect(page.getByRole("option", { name: "Laptops" })).toBeFocused();
      await page.keyboard.press("Enter");
    });

    await test.step("laptops are shown and the search field is empty", async () => {
      await expect(page.getByText("5 products found")).toBeVisible();
      await expectTitles(page, LAPTOP_TITLES);
      await expect(searchField(page)).toHaveValue("");
      await expect(page).toHaveURL(/\/product\?category=laptops$/);
    });
  });

  test("page change adds a history entry, Back restores the page", async ({ page }) => {
    await page.goto("/product");
    await expectTitles(page, FIRST_PAGE_TITLES);

    const pagination = page.getByRole("navigation", { name: "Pagination" });

    await test.step("page 2 is opened and marked", async () => {
      await pagination.getByRole("button", {
        exact: true,
        name: "Go to page 2",
      }).click();

      await expect(page).toHaveURL(/\/product\?page=2$/);
      await expectTitles(page, SECOND_PAGE_TITLES);
      await expect(pagination.getByRole("button", {
        exact: true,
        name: "page 2",
      }))
        .toHaveAttribute("aria-current", "page");
    });

    await test.step("Back returns to the first page", async () => {
      await page.goBack();

      await expect(page).toHaveURL(/\/product$/);
      await expectTitles(page, FIRST_PAGE_TITLES);
    });
  });

  test("search clears category", async ({ page }) => {
    await page.goto("/product?category=laptops");
    await expectTitles(page, LAPTOP_TITLES);
    await expect(categoryField(page)).toHaveText("Laptops");

    await test.step("typing mac resets Category and shows the mac results", async () => {
      await searchField(page).fill("mac");

      await expect(categoryField(page)).toHaveText("All categories");
      await expect(page).toHaveURL(/\/product\?q=mac$/);
      await expect(page.getByText("2 products found")).toBeVisible();
      await expectTitles(page, MAC_TITLES);
    });
  });

  test("latest request wins", async ({ dummyJson, page }) => {
    const phoneSearch = dummyJson.hold(PHONE_SEARCH_REQUEST);

    await page.goto("/product");
    await expect(page.getByText("194 products found")).toBeVisible();

    await test.step("search phone, its response is held", async () => {
      await searchField(page).fill("phone");
      await phoneSearch.arrived;

      await expect(page).toHaveURL(/\/product\?q=phone$/);
    });

    await test.step("choosing Laptops before the phone response shows the laptops", async () => {
      await chooseCategory(page, "Laptops");

      await expect(page.getByText("5 products found")).toBeVisible();
      await expectTitles(page, LAPTOP_TITLES);
    });

    await test.step("the late phone response was aborted, laptops stay", async () => {
      await phoneSearch.release();

      expect(await phoneSearch.outcome).toBe("aborted");

      await expect(page).toHaveURL(/\/product\?category=laptops$/);
      await expect(page.getByText("5 products found")).toBeVisible();
      await expectTitles(page, LAPTOP_TITLES);
      await expectNoTitles(page, PHONE_TITLES);
    });
  });

  test("leaving the catalog and coming back", async ({ dummyJson, page }) => {
    const phoneSearch = dummyJson.hold(PHONE_SEARCH_REQUEST);

    await page.goto("/product");
    await expect(page.getByText("194 products found")).toBeVisible();

    await test.step("search phone, its response is held, the full list stays", async () => {
      await searchField(page).fill("phone");
      await phoneSearch.arrived;

      await expect(page).toHaveURL(/\/product\?q=phone$/);
      await expect(page.getByText("194 products found")).toBeVisible();
    });

    await test.step("open a product while the phone response is held", async () => {
      await page.getByRole("link", { name: "Essence Mascara Lash Princess" }).click();

      await expect(page).toHaveURL(/\/products\/1$/);
      await expect(page.getByRole("heading", { name: "Essence Mascara Lash Princess" }))
        .toBeVisible();
    });

    await test.step("Back to products returns to the phone search", async () => {
      await page.getByRole("link", { name: "Back to products" }).click();

      await expect(page).toHaveURL(/\/product\?q=phone$/);
      await expect(page.getByText("3 products found")).toBeVisible();
      await expectTitles(page, PHONE_TITLES);
    });

    await test.step("choose Laptops", async () => {
      await chooseCategory(page, "Laptops");

      await expect(page.getByText("5 products found")).toBeVisible();
      await expectTitles(page, LAPTOP_TITLES);
    });

    await test.step("the first phone response was aborted, only laptops stay", async () => {
      await phoneSearch.release();

      expect(await phoneSearch.outcome).toBe("aborted");

      await expect(page).toHaveURL(/\/product\?category=laptops$/);
      await expect(page.getByText("5 products found")).toBeVisible();
      await expectTitles(page, LAPTOP_TITLES);
      await expectNoTitles(page, PHONE_TITLES);
    });
  });
});

import { expect, test } from "./fixtures/test.ts";

const UNSTUBBED_PATH = "/products/9999";

test("a held request without a fixture is a violation and is aborted on release", async ({
  dummyJson,
  page,
}) => {
  await page.goto("/product");

  const held = dummyJson.hold(UNSTUBBED_PATH);
  const result = page.evaluate(
    (url) => fetch(url).then(() => "fulfilled", () => "rejected"),
    `https://dummyjson.com${UNSTUBBED_PATH}`,
  );

  await held.arrived;
  await held.release();

  expect(await result).toBe("rejected");
  expect(await held.outcome).toBe("aborted");
  expect(dummyJson.violations).toEqual([`unmatched: https://dummyjson.com${UNSTUBBED_PATH}`]);

  // The violation is the expected result here: clear it so the fixture's teardown stays green.
  dummyJson.violations.length = 0;
});

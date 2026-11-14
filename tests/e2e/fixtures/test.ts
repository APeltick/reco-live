import type { DummyJsonHandle } from "./mock-dummy-json.ts";

import { test as base, expect } from "@playwright/test";

import { mockDummyJson } from "./mock-dummy-json.ts";

/**
 * `test` for every e2e spec: the DummyJSON stub is set up for each test (automatically,
 * the handle is available as the `dummyJson` fixture: `requests`, `hold(match)`,
 * `violations`, see `mock-dummy-json.ts`). After the test the routes are removed and the
 * test fails if the page sent a request the stub did not expect.
 */
export const test = base.extend<{ dummyJson: DummyJsonHandle }>({
  dummyJson: [
    async ({
      baseURL,
      context,
      page,
    }, use) => {
      const handle = await mockDummyJson(page, {}, { baseURL });

      await use(handle);

      // Parked routes must not throw at teardown.
      await context.unrouteAll({ behavior: "ignoreErrors" });

      expect(
        handle.violations,
        `unexpected requests:\n${handle.violations.join("\n")}`,
      ).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

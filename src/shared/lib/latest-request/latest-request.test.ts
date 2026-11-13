import {
  describe,
  expect,
  it,
} from "vitest";

import { createLatestRequest } from "./index";

describe("createLatestRequest", () => {
  it("aborts the previous signal when next() is called again", () => {
    const latest = createLatestRequest();
    const first = latest.next();
    const second = latest.next();

    expect(first.aborted).toBe(true);
    expect(second.aborted).toBe(false);
  });

  it("aborts the current signal on abort()", () => {
    const latest = createLatestRequest();
    const signal = latest.next();

    latest.abort();

    expect(signal.aborted).toBe(true);
  });

  it("does not throw on abort() before any next()", () => {
    const latest = createLatestRequest();

    expect(() => {
      latest.abort();
    }).not.toThrow();
  });

  it("returns a fresh signal from next() after abort()", () => {
    const latest = createLatestRequest();

    latest.next();
    latest.abort();

    expect(latest.next().aborted).toBe(false);
  });
});

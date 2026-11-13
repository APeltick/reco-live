import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { scheduleDebounced } from "./schedule-debounced";

const DELAY_MS = 300;

describe("scheduleDebounced", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls the callback once with the value at delayMs", () => {
    const callback = vi.fn();

    scheduleDebounced("abc", DELAY_MS, () => false, callback);

    vi.advanceTimersByTime(DELAY_MS - 1);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("abc");
  });

  it("schedules nothing when skipped up front", () => {
    const callback = vi.fn();

    scheduleDebounced("abc", DELAY_MS, () => true, callback);

    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(DELAY_MS * 2);
    expect(callback).not.toHaveBeenCalled();
  });

  it("does not call the callback when skipped during the pause", () => {
    const callback = vi.fn();
    let isSkipped = false;

    scheduleDebounced("abc", DELAY_MS, () => isSkipped, callback);

    vi.advanceTimersByTime(DELAY_MS - 1);
    isSkipped = true;
    vi.advanceTimersByTime(1);

    expect(callback).not.toHaveBeenCalled();
  });

  it("does not call the callback after cancel", () => {
    const callback = vi.fn();

    const cancel = scheduleDebounced("abc", DELAY_MS, () => false, callback);

    vi.advanceTimersByTime(DELAY_MS - 1);
    cancel();
    vi.advanceTimersByTime(DELAY_MS);

    expect(callback).not.toHaveBeenCalled();
  });
});

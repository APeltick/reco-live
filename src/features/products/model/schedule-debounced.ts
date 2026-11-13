/**
 * Schedules `callback(value)` after `delayMs`, unless `isSkipped(value)` is true
 * up front or still true when the timer fires. Returns a cancel function.
 */
export function scheduleDebounced<Value>(
  value: Value,
  delayMs: number,
  isSkipped: (value: Value) => boolean,
  callback: (value: Value) => void,
): () => void {
  if (isSkipped(value)) {
    return () => {
      // nothing was scheduled, nothing to cancel
    };
  }

  const timer = setTimeout(() => {
    // re-check against the latest state: it may have changed during the pause
    if (isSkipped(value)) {
      return;
    }

    callback(value);
  }, delayMs);

  return () => {
    clearTimeout(timer);
  };
}

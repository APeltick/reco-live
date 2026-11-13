import {
  useEffect,
  useRef,
} from "react";

import { scheduleDebounced } from "./schedule-debounced";

/**
 * Calls `callback(value)` after `delayMs` without a change of `value`.
 * `isSkipped(value)` true → nothing is scheduled (and a pending call is cancelled).
 */
export function useDebouncedValue<Value>(
  value: Value,
  delayMs: number,
  isSkipped: (value: Value) => boolean,
  callback: (value: Value) => void,
): void {
  const callbackReference = useRef(callback);
  const skipCheckReference = useRef(isSkipped);

  useEffect(() => {
    callbackReference.current = callback;
    skipCheckReference.current = isSkipped;
  });

  useEffect(() => {
    return scheduleDebounced(
      value,
      delayMs,
      (v) => skipCheckReference.current(v),
      (v) => { callbackReference.current(v); },
    );
  }, [value, delayMs]);
}

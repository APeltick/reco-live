import {
  useEffect,
  useRef,
} from "react";

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
    if (skipCheckReference.current(value)) {
      return;
    }

    const timer = setTimeout(() => {
      // re-check against the latest state: the URL may have changed during the pause
      if (skipCheckReference.current(value)) {
        return;
      }

      callbackReference.current(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);
}

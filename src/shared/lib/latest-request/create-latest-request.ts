export interface LatestRequest {
  /** Cancels the current request, if any. */
  abort: () => void;
  /** Aborts the previous request and returns the signal of a new one. */
  next: () => AbortSignal;
}

export function createLatestRequest(): LatestRequest {
  let controller: AbortController | null = null;

  return {
    abort() {
      controller?.abort();
    },
    next() {
      controller?.abort();
      controller = new AbortController();

      return controller.signal;
    },
  };
}

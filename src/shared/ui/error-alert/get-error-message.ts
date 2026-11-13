import { isNetworkError } from "~shared/api";

const T_T_DEV = { network: "No connection to the server. Check your internet connection and try again." } as const;

/** The network text when the request got no response at all, otherwise the caller's generic text. */
export function getErrorMessage(error: unknown, genericText: string): string {
  return isNetworkError(error) ? T_T_DEV.network : genericText;
}

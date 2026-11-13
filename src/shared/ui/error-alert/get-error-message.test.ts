import {
  describe, expect, it,
} from "vitest";
import { RequestError } from "~shared/api";

import { getErrorMessage } from "./get-error-message";

const NETWORK_TEXT = "No connection to the server. Check your internet connection and try again.";
const GENERIC = "Could not load products.";

describe("getErrorMessage", () => {
  it("returns the network text for a network RequestError", () => {
    const error = new RequestError("Network request failed.", { isNetworkError: true });

    expect(getErrorMessage(error, GENERIC)).toBe(NETWORK_TEXT);
  });

  it("returns the generic text for a RequestError with a response", () => {
    const error = new RequestError("Server error.", { response: new Response(null, { status: 500 }) });

    expect(getErrorMessage(error, GENERIC)).toBe(GENERIC);
  });

  it("returns the generic text for a plain Error", () => {
    expect(getErrorMessage(new Error("boom"), GENERIC)).toBe(GENERIC);
  });

  it("returns the generic text for undefined", () => {
    expect(getErrorMessage(undefined, GENERIC)).toBe(GENERIC);
  });
});

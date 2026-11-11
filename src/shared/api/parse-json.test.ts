import {
  describe, expect, it,
} from "vitest";
import { parseJson } from "~shared/api/parse-json";
import { RequestError } from "~shared/api/request";

describe("parseJson", () => {
  it("returns the parsed value of a valid JSON body", async () => {
    const response = Response.json({ items: [1, 2] });

    await expect(parseJson(response)).resolves.toEqual({ items: [1, 2] });
  });

  it("throws RequestError with the same response and a cause for an invalid body", async () => {
    const response = new Response("not json");

    let error: unknown;

    try {
      await parseJson(response);
    } catch (error_) {
      error = error_;
    }

    expect(error).toBeInstanceOf(RequestError);
    expect((error as RequestError).response).toBe(response);
    expect((error as RequestError).cause).toBeDefined();
  });
});

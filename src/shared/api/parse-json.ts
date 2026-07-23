import { RequestError } from "~shared/api/request";

const T_T_DEV = { invalidJson: "Products response is not valid JSON." } as const;

export async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json() as unknown;
  } catch (error) {
    throw new RequestError(T_T_DEV.invalidJson, {
      cause: error,
      response,
    });
  }
}

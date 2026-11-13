import { ROUTES_CONSTANTS } from "~shared/config/routes";

const CATALOG_PATH = ROUTES_CONSTANTS.product;

export function createProductBackLink(from: unknown): string {
  if (typeof from === "string" && (from === "" || from.startsWith("?"))) {
    return `${CATALOG_PATH}${from}`;
  }

  return CATALOG_PATH;
}

const CATALOG_PATH = "/product";

export function createProductBackLink(from: unknown): string {
  if (typeof from === "string" && (from === "" || from.startsWith("?"))) {
    return `${CATALOG_PATH}${from}`;
  }

  return CATALOG_PATH;
}

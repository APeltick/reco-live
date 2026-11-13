const PRODUCT_ID_PATTERN = /^[1-9]\d*$/;

export function parseProductId(parameter: string | undefined): number | null {
  if (parameter === undefined || !PRODUCT_ID_PATTERN.test(parameter)) {
    return null;
  }

  const id = Number(parameter);

  return Number.isSafeInteger(id) ? id : null;
}

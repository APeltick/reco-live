import { lazy } from "react";

export const ProductPageLazy = lazy(async () => {
  const module = await import("./product-page");

  return { default: module.ProductPage };
});

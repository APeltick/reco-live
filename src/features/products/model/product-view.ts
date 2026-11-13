import type { Product } from "./product.types";

const usdFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  style: "currency",
});

export function getProductPhoto(
  product: Pick<Product, "images" | "thumbnail">,
): string {
  return product.images[0] ?? product.thumbnail;
}

export function formatUsdPrice(price: number): string {
  return usdFormatter.format(price);
}

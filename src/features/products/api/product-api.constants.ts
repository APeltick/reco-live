export const PRODUCT_URLS = {
  productById: (productId: number) => `/products/${String(productId)}`,
  productsCollection: "/products",
} as const;

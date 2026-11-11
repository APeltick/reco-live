export const PRODUCT_URLS = {
  categories: "/products/categories",
  productById: (productId: number) => `/products/${String(productId)}`,
  productsByCategory: (slug: string) =>
    `/products/category/${encodeURIComponent(slug)}`,
  productsCollection: "/products",
  productsSearch: "/products/search",
} as const;

import type { Categories } from "./product.types";

export interface CategoryOption {
  label: string;
  value: string;
}

interface GetCategoryOptionsParams {
  allLabel: string;
  categories: Categories;
  slug: string;
}

/**
 * Options of the category select in render order: `All categories`, then the
 * slug from the URL when it is not among the loaded categories, then the loaded ones.
 */
export function getCategoryOptions({
  allLabel,
  categories,
  slug,
}: GetCategoryOptionsParams): CategoryOption[] {
  const hasUnlistedCategory = slug !== ""
    && categories.every((category) => category.slug !== slug);

  return [
    {
      label: allLabel,
      value: "",
    },
    ...(hasUnlistedCategory
      ? [{
          label: slug,
          value: slug,
        }]
      : []),
    ...categories.map((category) => ({
      label: category.name,
      value: category.slug,
    })),
  ];
}

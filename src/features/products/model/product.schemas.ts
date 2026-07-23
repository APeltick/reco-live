import * as z from "zod";

const DateTimeSchema = z.iso.datetime();

const DimensionsSchema = z.object({
  depth: z.number(),
  height: z.number(),
  width: z.number(),
});

const MetaSchema = z.object({
  barcode: z.string(),
  createdAt: DateTimeSchema,
  qrCode: z.string(),
  updatedAt: DateTimeSchema,
});

const ReviewSchema = z.object({
  comment: z.string(),
  date: DateTimeSchema,
  rating: z.number(),
  reviewerEmail: z.string(),
  reviewerName: z.string(),
});

export const ProductSchema = z.object({
  availabilityStatus: z.string(),
  category: z.string(),
  description: z.string(),
  dimensions: DimensionsSchema,
  discountPercentage: z.number(),
  id: z.string(),
  images: z.array(z.string()),
  meta: MetaSchema,
  minimumOrderQuantity: z.number(),
  price: z.number(),
  rating: z.number(),
  returnPolicy: z.string(),
  reviews: z.array(ReviewSchema),
  shippingInformation: z.string(),
  sku: z.string(),
  stock: z.number(),
  tags: z.array(z.string()),
  thumbnail: z.string(),
  title: z.string(),
  warrantyInformation: z.string(),
  weight: z.number(),
});

export const ProductsCollectionSchema = z.object({
  data: z.array(ProductSchema),
  first: z.number(),
  items: z.number(),
  last: z.number(),
  next: z.number().nullable(),
  pages: z.number(),
  prev: z.number().nullable(),
});

import { Suspense } from "react";
import { createBrowserRouter } from "react-router";
import { AppErrorBoundary } from "~app/error-handling";
import { MainLayout } from "~app/layouts/main-layout";
import { getProductById, resolveProductDetails } from "~features/products";
import { HomePage } from "~pages/home";
import { ProductPageLazy } from "~pages/product";
import { ROUTES_CONSTANTS } from "~shared/config/routes";
import { ContainerLoader } from "~shared/ui/container-loader";

export const router = createBrowserRouter([
  {
    id: "root",
    ErrorBoundary: AppErrorBoundary,
    Component: MainLayout,
    children: [
      {
        path: ROUTES_CONSTANTS.dashboard,
        Component: HomePage,
      },
      {
        path: ROUTES_CONSTANTS.product,
        element: (
          <Suspense fallback={<ContainerLoader />}>
            <ProductPageLazy />
          </Suspense>
        ),
      },
      {
        path: ROUTES_CONSTANTS.productDetails,
        HydrateFallback: ContainerLoader,
        loader: async ({ params, request }) => {
          const result = await resolveProductDetails(
            params["id"],
            getProductById,
            request.signal,
          );

          if (result.kind === "not-found") {
            throw new Response("Not found", { status: 404 });
          }

          return result;
        },
        lazy: async () => {
          const module = await import("~pages/product-details");

          return { Component: module.ProductDetailsPage };
        },
      },
      {
        path: "*",
        loader: () => {
          throw new Response("Not found", { status: 404 });
        },
      },
    ],
  },
]);

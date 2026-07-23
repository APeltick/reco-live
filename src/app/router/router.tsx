import { Suspense } from "react";
import { createBrowserRouter } from "react-router";
import { AppErrorBoundary } from "~app/error-handling";
import { MainLayout } from "~app/layouts/main-layout";
import { HomePage } from "~pages/home";
import { ProductPageLazy } from "~pages/product";
import { ContainerLoader } from "~shared/ui/container-loader";

import { ROUTES_CONSTANTS } from "./routes.constants";

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
        path: "*",
        loader: () => {
          throw new Response("Not found", { status: 404 });
        },
      },
    ],
  },
]);

import { useEffect } from "react";
import { isRouteErrorResponse, useRouteError } from "react-router";
import { ErrorPage } from "~pages/error";
import { NotFoundPage } from "~pages/not-found";

export function AppErrorBoundary() {
  const error = useRouteError();
  const isNotFound = isRouteErrorResponse(error) && error.status === 404;

  useEffect(() => {
    if (!isNotFound) {
      console.error(error);
    }
  }, [error, isNotFound]);

  if (isNotFound) {
    return <NotFoundPage />;
  }

  return <ErrorPage />;
}

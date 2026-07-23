import { isRouteErrorResponse, useRouteError } from "react-router";
import { NotFoundPage } from "~pages/not-found";

export function AppErrorBoundary() {
  const error = useRouteError();
  const isErrorRoute = isRouteErrorResponse(error);

  return (
    <>
      {(isErrorRoute && error.status === 404) && (
        <NotFoundPage />
      )}
    </>
  );
}

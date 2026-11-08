import MuiLink from "@mui/material/Link";
import { Link as RouterLink } from "react-router";
import { ROUTES_CONSTANTS } from "~shared/config/routes";
import { StatusPage } from "~shared/ui/status-page";

export function NotFoundPage() {
  return (
    <StatusPage
      title="Page not found"
      description="The page you are looking for doesn't exist or has been moved."
    >
      <MuiLink component={RouterLink} to={ROUTES_CONSTANTS.dashboard}>
        Go to home
      </MuiLink>
    </StatusPage>
  );
}

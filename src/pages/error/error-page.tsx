import Button from "@mui/material/Button";
import MuiLink from "@mui/material/Link";
import { Link as RouterLink } from "react-router";
import { ROUTES_CONSTANTS } from "~shared/config/routes";
import { StatusPage } from "~shared/ui/status-page";

export function ErrorPage() {
  return (
    <StatusPage
      title="Something went wrong"
      description="An unexpected error occurred. Please try again or go back to the home page."
    >
      <Button variant="contained" onClick={() => { location.reload(); }}>
        Try again
      </Button>
      <MuiLink component={RouterLink} to={ROUTES_CONSTANTS.dashboard}>
        Go to home
      </MuiLink>
    </StatusPage>
  );
}

import Button from "@mui/material/Button";
import MuiLink from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Link as RouterLink } from "react-router";
import { ROUTES_CONSTANTS } from "~shared/config/routes";

export function ErrorPage() {
  return (
    <Stack
      spacing={2}
      sx={{
        alignItems: "center",
        backgroundColor: "background.default",
        height: "100svh",
        justifyContent: "center",
        maxHeight: "100%",
        padding: 3,
        textAlign: "center",
      }}
    >
      <Typography component="h1" variant="h4">
        Something went wrong
      </Typography>
      <Typography color="text.secondary">
        An unexpected error occurred. Please try again or go back to the home page.
      </Typography>
      <Button variant="contained" onClick={() => { location.reload(); }}>
        Try again
      </Button>
      <MuiLink component={RouterLink} to={ROUTES_CONSTANTS.dashboard}>
        Go to home
      </MuiLink>
    </Stack>
  );
}

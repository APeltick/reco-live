import MuiLink from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Link as RouterLink } from "react-router";
import { ROUTES_CONSTANTS } from "~shared/config/routes";

export function NotFoundPage() {
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
        Page not found
      </Typography>
      <Typography color="text.secondary">
        The page you are looking for doesn&apos;t exist or has been moved.
      </Typography>
      <MuiLink component={RouterLink} to={ROUTES_CONSTANTS.dashboard}>
        Go to home
      </MuiLink>
    </Stack>
  );
}

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  Link as RouterLink,
  useLoaderData,
  useLocation,
  useRevalidator,
} from "react-router";
import {
  createProductBackLink,
  formatUsdPrice,
  getProductPhoto,
  type ProductDetailsResult,
} from "~features/products";
import { ContainerLoader } from "~shared/ui/container-loader";

const T_T_DEV = {
  back: "Back to products",
  loadError: "Could not load the product.",
  retry: "Try again",
} as const;

export function ProductDetailsPage() {
  const result = useLoaderData<ProductDetailsResult>();
  const location = useLocation();
  const revalidator = useRevalidator();

  if (revalidator.state === "loading") {
    return <ContainerLoader />;
  }

  const backLink = createProductBackLink(
    (location.state as { from?: unknown } | null)?.from,
  );

  return (
    <Stack spacing={2}>
      <Box
        component={RouterLink}
        sx={{ color: "primary.main" }}
        to={backLink}
      >
        {T_T_DEV.back}
      </Box>
      {result.kind === "error" && (
        <Alert
          action={(
            <Button
              color="inherit"
              onClick={() => {
                void revalidator.revalidate();
              }}
              size="small"
            >
              {T_T_DEV.retry}
            </Button>
          )}
          severity="error"
        >
          {T_T_DEV.loadError}
        </Alert>
      )}
      {result.kind === "product" && (
        <Stack spacing={2}>
          <Box
            alt={result.product.title}
            component="img"
            src={getProductPhoto(result.product)}
            sx={{
              maxWidth: 400,
              width: "100%",
            }}
          />
          <Typography component="h1" variant="h4">
            {result.product.title}
          </Typography>
          <Typography variant="h6">
            {formatUsdPrice(result.product.price)}
          </Typography>
          <Typography>{result.product.description}</Typography>
        </Stack>
      )}
    </Stack>
  );
}

import Box from "@mui/material/Box";
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
import { ErrorAlert } from "~shared/ui/error-alert";

const T_T_DEV = {
  back: "Back to products",
  loadError: "Could not load the product.",
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
        <ErrorAlert
          error={result.error}
          genericText={T_T_DEV.loadError}
          onRetry={() => {
            void revalidator.revalidate();
          }}
        />
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

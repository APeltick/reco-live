import Stack from "@mui/material/Stack";
import { useFetchProducts } from "~features/products";

export function ProductPage() {
  const {
    collection,
    error,
    isError,
  } = useFetchProducts({
    _page: 1,
    _per_page: 10,
  });

  if (isError) {
    const errorMessage = error instanceof Error
      ? error.message
      : "Products request failed.";

    return <p role="alert">{errorMessage}</p>;
  }
  return (
    <Stack spacing={2}>
      {collection?.data.map((product) => (
        <p key={product.id}>{product.title}</p>
      ))}
    </Stack>
  );
}

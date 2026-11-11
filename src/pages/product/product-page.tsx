import Stack from "@mui/material/Stack";
import { useFetchProducts } from "~features/products";

export function ProductPage() {
  const {
    collection,
    error,
    isError,
  } = useFetchProducts();

  if (isError) {
    const errorMessage = error instanceof Error
      ? error.message
      : "Products request failed.";

    return <p role="alert">{errorMessage}</p>;
  }
  return (
    <Stack spacing={2}>
      {collection !== null && (
        <p>{`${String(collection.total)} products found`}</p>
      )}
      {collection?.products.map((product) => (
        <p key={product.id}>{product.title}</p>
      ))}
    </Stack>
  );
}

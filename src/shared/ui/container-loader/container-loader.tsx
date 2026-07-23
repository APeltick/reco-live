import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

export function ContainerLoader() {
  return (
    <Box
      sx={{
        alignItems: "center",
        display: "flex",
        inset: 0,
        justifyContent: "center",
        position: "absolute",
      }}
    >
      <CircularProgress />
    </Box>
  );
}

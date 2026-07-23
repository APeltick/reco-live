import Stack from "@mui/material/Stack";
import { Outlet } from "react-router";

export function MainLayout() {
  return (
    <Stack
      direction="row"
      sx={{
        backgroundColor: "background.default",
        height: "100svh",
        maxHeight: "100%",
        overflow: "hidden",
      }}
    >
      <Outlet />
    </Stack>
  );
}

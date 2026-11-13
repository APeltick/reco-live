import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import { Outlet, useNavigation } from "react-router";

export function MainLayout() {
  const navigation = useNavigation();

  return (
    <Stack
      direction="row"
      sx={{
        backgroundColor: "background.default",
        height: "100svh",
        maxHeight: "100%",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {navigation.state === "loading" && (
        <LinearProgress
          aria-label="Loading page"
          sx={{
            insetInline: 0,
            position: "absolute",
            top: 0,
            zIndex: 1,
          }}
        />
      )}
      <Outlet />
    </Stack>
  );
}

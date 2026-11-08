import type { ReactNode } from "react";

import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

interface StatusPageProps {
  title: string;
  description: string;
  children?: ReactNode;
}

export function StatusPage({
  title,
  description,
  children,
}: StatusPageProps) {
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
        {title}
      </Typography>
      <Typography color="text.secondary">{description}</Typography>
      {children}
    </Stack>
  );
}

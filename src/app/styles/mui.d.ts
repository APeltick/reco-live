import type { PartialColor } from "~app/styles/theme.types";

import "@mui/material/styles";

declare module "@mui/material/styles" {
  interface TypeBackground {
    blue: string;
    level1: string;
    level2: string;
    level3: string;
    sidebar: string;
  }

  interface Color {
    950: string;
  }

  interface Palette {
    neutral: PartialColor;
  }

  interface PaletteOptions {
    neutral?: PartialColor;
  }
}

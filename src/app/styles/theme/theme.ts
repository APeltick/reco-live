import type { ThemeOptions } from "@mui/material/styles";

import { createTheme } from "@mui/material/styles";
import { colorSchemes } from "~app/styles/theme/color-schemes";

const brandedTokens: ThemeOptions = { shape: { borderRadius: 4 } };

const brandedComponents: ThemeOptions["components"] = {
  MuiButton: {
    defaultProps: { disableElevation: true },
    styleOverrides: {
      root: {
        "minWidth": "unset",
        "textTransform": "capitalize",
        "&:hover": { textDecoration: "underline" },
      },
    },
  },
};

export const brandedTheme = createTheme({
  ...brandedTokens,
  colorSchemes,
  components: brandedComponents,
  cssVariables: { colorSchemeSelector: "class" },
});

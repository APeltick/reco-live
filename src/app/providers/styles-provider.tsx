import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import { type ReactNode } from "react";
import { brandedTheme } from "~app/styles/theme/theme";

// console.log(brandedTheme);

interface StylesProviderProps {
  children: ReactNode;
}

export function StylesProvider(props: StylesProviderProps) {
  const { children } = props;

  return (
    <MuiThemeProvider theme={brandedTheme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}

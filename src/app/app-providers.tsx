import { Provider } from "react-redux";
import { RouterProvider } from "react-router/dom";

import { StylesProvider } from "./providers";
import { router } from "./router";
import { store } from "./store";

export function AppProviders() {
  return (
    <Provider store={store}>
      <StylesProvider>
        <RouterProvider router={router} />
      </StylesProvider>
    </Provider>
  );
}

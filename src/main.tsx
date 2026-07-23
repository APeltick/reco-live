import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app/app";

const root = document.querySelector("#root");

if (!root) {
  throw new Error("There is no root element!");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Vite configuration reference: https://vite.dev/config/
export default defineConfig({
  // Enables React Fast Refresh and JSX transformation.
  // The Babel preset compiles React ui and hooks for automatic memoization.
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tsconfigPaths(),
  ],
  resolve: {
    // Ensures that linked packages share one runtime instance of these libraries.
    dedupe: [
      "@emotion/react",
      "@emotion/styled",
      "react",
      "react-dom",
    ],
  },
  build: {
    // Produces JavaScript compatible with the browsers declared in package.json.
    target: [
      "chrome117",
      "edge121",
      "firefox121",
      "safari17",
    ],
    // Excludes source maps from the production build.
    sourcemap: false,
  },
  server: {
    // Binds the development server to the local machine only.
    host: "127.0.0.1",
    // Fails instead of silently choosing another port when the port is occupied.
    strictPort: true,
  },
  preview: {
    // Binds the production preview server to the local machine only.
    host: "127.0.0.1",
    // Fails instead of silently choosing another port when the port is occupied.
    strictPort: true,
  },
});

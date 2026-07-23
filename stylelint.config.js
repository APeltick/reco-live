// Lints plain CSS and CSS inside Emotion tagged templates.
export default {
  // Applies Stylelint's standard CSS correctness and formatting rules.
  extends: ["stylelint-config-standard"],
  overrides: [
    {
      // Extracts CSS from tagged templates before Stylelint processes it.
      customSyntax: "postcss-styled-syntax",
      files: ["**/*.{ts,tsx}"],
    },
  ],
  // Skips generated output and installed dependencies.
  ignoreFiles: [
    "dist/**",
    "node_modules/**",
  ],
  rules: {
    // Replaces named colors with theme tokens, CSS variables, or explicit colors.
    "color-named": "never",
    // Prevents !important because it hinders theme overrides and increases specificity.
    "declaration-no-important": true,
    // Prevents ID selectors because they create excessive specificity.
    "selector-max-id": 0,
    // Limits overly complex selector chains.
    "selector-max-specificity": "0,3,0",
  },
};

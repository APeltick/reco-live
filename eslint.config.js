import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";
import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import { fixupPluginRules } from "@eslint/compat";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import compat from "eslint-plugin-compat";
import importX from "eslint-plugin-import-x";
import jsxA11y from "eslint-plugin-jsx-a11y";
import newlineDestructuring from "eslint-plugin-newline-destructuring";
import noUnsanitized from "eslint-plugin-no-unsanitized";
import perfectionist from "eslint-plugin-perfectionist";
import reactDom from "eslint-plugin-react-dom";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import reactX from "eslint-plugin-react-x";
import regexp from "eslint-plugin-regexp";
import security from "eslint-plugin-security";
import sonarjs from "eslint-plugin-sonarjs";
import unicorn from "eslint-plugin-unicorn";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

// =============================================================================
// SHARED FORMATTING, IMPORT, AND eslint-disable SETTINGS
// =============================================================================

// ESLint Stylistic fully replaces Prettier for JavaScript, TypeScript, and JSX.
const stylisticBaseConfig = stylistic.configs.customize({
  // Always wrap arrow-function parameters in parentheses.
  arrowParens: true,
  // Uses the conventional opening-brace style: `if (...) {`.
  braceStyle: "1tbs",
  // Requires trailing commas in multiline lists where JavaScript permits them.
  commaDangle: "always-multiline",
  // Uses two spaces for each indentation level.
  indent: 2,
  // Enables JSX-specific formatting rules.
  jsx: true,
  // Uses double quotes for string literals.
  quotes: "double",
  // Requires semicolons at statement boundaries.
  semi: true,
});

const stylisticConfig = {
  ...stylisticBaseConfig,
  plugins: {
    ...stylisticBaseConfig.plugins,
    // The adapter is required because this plugin still uses the pre-v9 ESLint API.
    "newline-destructuring": fixupPluginRules(newlineDestructuring),
  },
  rules: {
    ...stylisticBaseConfig.rules,
    // Objects, destructuring patterns, imports, and exports with three or more
    // items put their opening and closing braces on separate lines.
    "@stylistic/object-curly-newline": [
      "error",
      {
        ExportDeclaration: {
          // Wrap exports containing at least three specifiers.
          minProperties: 3,
          // Preserve multiline exports even below the property threshold.
          multiline: true,
        },
        ImportDeclaration: {
          // Wrap imports containing at least three specifiers.
          minProperties: 3,
          // Preserve multiline imports even below the property threshold.
          multiline: true,
        },
        ObjectExpression: {
          // Wrap object literals containing at least three properties.
          minProperties: 3,
          // Preserve multiline object literals even below the property threshold.
          multiline: true,
        },
        ObjectPattern: {
          // Wrap object destructuring containing at least three properties.
          minProperties: 3,
          // Preserve multiline object destructuring below the property threshold.
          multiline: true,
        },
      },
    ],
    // Each property in a multi-property object must be placed on its own line.
    "@stylistic/object-property-newline": [
      "error",
      {
        // Disallows several object properties on one line after a line break.
        allowAllPropertiesOnSameLine: false,
      },
    ],
    // Empty HTML elements and React ui must be self-closing:
    // <div /> and <Button />, rather than <div></div> or <Button></Button>.
    "@stylistic/jsx-self-closing-comp": [
      "error",
      {
        // Applies the self-closing requirement to React ui.
        component: true,
        // Applies the self-closing requirement to native HTML elements.
        html: true,
      },
    ],
    // Object destructuring with three or more fields always uses separate lines.
    // Compact one-line syntax is allowed for one or two fields.
    "newline-destructuring/newline": [
      "error",
      {
        // Requires a consistent layout for matching destructuring patterns.
        consistent: true,
        // Keeps one or two fields compact; wraps three or more fields.
        items: 2,
      },
    ],
  },
};

// eslint-plugin-jsx-a11y still uses the pre-v9 ESLint API, so its strict preset
// is loaded through the official compatibility adapter.
const jsxA11yStrictConfig = {
  ...jsxA11y.flatConfigs.strict,
  plugins: { "jsx-a11y": fixupPluginRules(jsxA11y) },
  rules: {
    ...jsxA11y.flatConfigs.strict.rules,
    // Link text must explain its purpose instead of using ambiguous text like "here".
    "jsx-a11y/anchor-ambiguous-text": "error",
    // Prevents aria-hidden on an element that can still receive focus.
    "jsx-a11y/no-aria-hidden-on-focusable": "error",
    // Ensures that lang contains a valid language tag.
    "jsx-a11y/lang": "error",
  },
};

// Teaches jsx-a11y about base MUI ui and the `component` prop, which
// changes the rendered DOM element, for example <Button component="a">.
const jsxA11ySettings = {
  "jsx-a11y": {
    components: {
      // Treats MUI Button as a native button for accessibility analysis.
      Button: "button",
      // Treats MUI Link as a native anchor for accessibility analysis.
      Link: "a",
    },
    // Makes jsx-a11y respect MUI's polymorphic component prop.
    polymorphicPropName: "component",
  },
};

// The TypeScript resolver lets import-x understand tsconfig paths and package exports.
const importResolverSettings = {
  "import-x/resolver-next": [
    createTypeScriptImportResolver({
      // Avoids a warning because the application and tooling use separate tsconfigs.
      noWarnOnMultipleProjects: true,
      // Resolves aliases and exports against both TypeScript projects.
      project: [
        "tsconfig.app.json",
        "tsconfig.node.json",
      ],
    }),
  ],
};

// Require eslint-disable directives to be paired, scoped, and actually used.
const eslintCommentsRules = {
  // Each eslint-disable must have a corresponding eslint-enable.
  "@eslint-community/eslint-comments/disable-enable-pair": "error",
  // Prevents one eslint-enable from ambiguously re-enabling multiple directives.
  "@eslint-community/eslint-comments/no-aggregating-enable": "error",
  // Prevents disabling a rule that is already disabled.
  "@eslint-community/eslint-comments/no-duplicate-disable": "error",
  // Requires an explicit rule list in eslint-disable directives.
  "@eslint-community/eslint-comments/no-unlimited-disable": "error",
  // Prevents eslint-enable directives without a matching disable.
  "@eslint-community/eslint-comments/no-unused-enable": "error",
};

// Baseline import correctness rules shared by the application and Vite config.
const importRules = {
  // All import statements must appear before executable code.
  "import-x/first": "error",
  // A blank line is required after the final import.
  "import-x/newline-after-import": "error",
  // Prevents circular dependencies between modules.
  "import-x/no-cycle": "error",
  // Prevents multiple import statements from the same module.
  "import-x/no-duplicates": "error",
  // Production code cannot import missing or development-only dependencies.
  "import-x/no-extraneous-dependencies": "error",
  // Prevents exporting mutable let bindings.
  "import-x/no-mutable-exports": "error",
  // Prevents bypassing npm package boundaries through relative paths.
  "import-x/no-relative-packages": "error",
  // A module cannot import itself.
  "import-x/no-self-import": "error",
  // Prevents paths with redundant segments such as folder/../file.
  "import-x/no-useless-path-segments": "error",
};

// Perfectionist is the only import and export sorting mechanism.
const sortingRules = {
  // Disabled to avoid a conflict with Perfectionist.
  "import-x/order": "off",
  // Sorts consecutive export ... from statements.
  "perfectionist/sort-exports": "error",
  // Sorts imports by group without reordering side-effect imports.
  "perfectionist/sort-imports": [
    "error",
    {
      // Defines the deterministic import group order.
      groups: [
        "type",
        "builtin",
        "external",
        "internal",
        ["parent", "sibling", "index"],
        "side-effect",
        "style",
      ],
      // Sorts items alphabetically within each group.
      order: "asc",
      // Keeps side-effect imports in their original order because order can matter.
      sortSideEffects: false,
      // Uses natural sorting, so Item2 comes before Item10.
      type: "natural",
    },
  ],
  // Sorts names inside export { A, B }.
  "perfectionist/sort-named-exports": "error",
  // Sorts names inside import { A, B }.
  "perfectionist/sort-named-imports": "error",
  // Disabled to avoid a conflict with Perfectionist.
  "sort-imports": "off",
};

// =============================================================================
// FINAL FLAT CONFIGURATION
// =============================================================================

export default defineConfig([
  // ---------------------------------------------------------------------------
  // FILES EXCLUDED FROM ESLINT
  // ---------------------------------------------------------------------------
  globalIgnores([
    // Production build output.
    "dist/**",
    // Test coverage reports.
    "coverage/**",
    // Installed dependencies.
    "node_modules/**",
    // Generated minified files.
    "*.min.js",
  ]),

  // ---------------------------------------------------------------------------
  // GLOBAL eslint-disable POLICY
  // ---------------------------------------------------------------------------
  {
    name: "global/linter-policy",
    linterOptions: {
      // Narrow eslint-disable directives are allowed and governed by the rules above.
      noInlineConfig: false,
      // Reports directives that no longer disable anything.
      reportUnusedDisableDirectives: "error",
      // Reports inline rule configuration that does not change the final config.
      reportUnusedInlineConfigs: "error",
    },
  },

  // ---------------------------------------------------------------------------
  // JAVASCRIPT TOOLING FILES
  // ---------------------------------------------------------------------------
  // React and browser rules do not apply here because config files run in Node.js.
  {
    name: "tooling/javascript",
    files: [
      "eslint.config.js",
      "stylelint.config.js",
    ],
    extends: [
      // Baseline JavaScript checks, such as no-undef and no-unreachable.
      js.configs.recommended,
      // Consistent JavaScript formatting without Prettier.
      stylisticConfig,
    ],
    languageOptions: {
      // Allows process, Buffer, and other Node.js globals.
      globals: globals.node,
    },
  },

  // ---------------------------------------------------------------------------
  // TYPESCRIPT TOOLING FILES
  // ---------------------------------------------------------------------------
  // The Vite config is linted strictly, but its API requires a default export.
  {
    name: "tooling/typescript",
    files: ["vite.config.ts"],
    extends: [
      // Baseline JavaScript checks.
      js.configs.recommended,
      // Strict TypeScript rules that use the project's real type information.
      ...tseslint.configs.strictTypeChecked,
      // Type-aware TypeScript style rules.
      ...tseslint.configs.stylisticTypeChecked,
      // Checks import and export existence and correctness.
      importX.flatConfigs.recommended,
      // Adds TypeScript syntax and module resolution support to import-x.
      importX.flatConfigs.typescript,
      // Formats TypeScript with ESLint Stylistic.
      stylisticConfig,
    ],
    languageOptions: {
      // vite.config.ts runs in Node.js rather than in the browser.
      globals: globals.node,
      parserOptions: {
        // Gives TypeScript ESLint rules access to program type information.
        projectService: true,
        // Makes tsconfig discovery independent of the command's working directory.
        tsconfigRootDir: import.meta.dirname,
      },
    },
    // Enables the TypeScript resolver for import-x.
    settings: importResolverSettings,
    plugins: {
      // Required by the sorting rules in sortingRules.
      perfectionist,
    },
    rules: {
      // Shared import correctness checks.
      ...importRules,
      // Shared deterministic import and export sorting.
      ...sortingRules,
      // Vite expects a default configuration export, so it is allowed here.
      "import-x/no-default-export": "off",
    },
  },

  // ---------------------------------------------------------------------------
  // MAIN REACT + TYPESCRIPT APPLICATION CODE
  // ---------------------------------------------------------------------------
  {
    name: "app/typescript-react",
    files: ["src/**/*.{ts,tsx}"],
    extends: [
      // Baseline JavaScript errors, including unreachable code and duplicate keys.
      js.configs.recommended,
      // The strictest TypeScript rules with type information.
      ...tseslint.configs.strictTypeChecked,
      // Type-aware TypeScript readability and consistency rules.
      ...tseslint.configs.stylisticTypeChecked,
      // Baseline import and export correctness.
      importX.flatConfigs.recommended,
      // TypeScript module support for import-x.
      importX.flatConfigs.typescript,
      // Strict React component checks with type information.
      reactX.configs["strict-type-checked"],
      // React DOM rules for props, HTML, links, forms, and dangerouslySetInnerHTML.
      reactDom.configs.recommended,
      // Strict JSX accessibility checks for ARIA, keyboard access, labels, and more.
      jsxA11yStrictConfig,
      // Official Rules of React and React Compiler diagnostics.
      reactHooks.configs.flat["recommended-latest"],
      // Preserves module compatibility with Vite Fast Refresh.
      reactRefresh.configs.vite,
      // Modern JavaScript correctness and best-practice rules.
      unicorn.configs.recommended,
      // Checks regular expressions for correctness and safety.
      regexp.configs["flat/recommended"],
      // Detects complexity, duplicated branches, and suspicious logic.
      sonarjs.configs.recommended,
      // Detects common unsafe JavaScript constructs.
      security.configs.recommended,
      // Prevents unsafe HTML writes through DOM APIs.
      noUnsanitized.configs.recommended,
      // Checks browser APIs against browserslist in package.json.
      compat.configs["flat/recommended"],
      // Formats JavaScript, TypeScript, and JSX with ESLint.
      stylisticConfig,
    ],
    languageOptions: {
      // Allows window, document, navigator, and other browser globals.
      globals: globals.browser,
      parserOptions: {
        // Enables rules that need real TypeScript type information.
        projectService: true,
        // Defines the root directory for tsconfig discovery.
        tsconfigRootDir: import.meta.dirname,
      },
    },
    // Enables the TypeScript resolver for import-x.
    settings: {
      ...importResolverSettings,
      ...jsxA11ySettings,
    },
    plugins: {
      // Validates eslint-disable directive usage.
      "@eslint-community/eslint-comments": eslintComments,
      // Sorts imports and exports without reordering potentially unsafe side effects.
      perfectionist,
    },
    rules: {
      // -----------------------------------------------------------------------
      // eslint-disable, IMPORTS, AND SORTING
      // -----------------------------------------------------------------------
      ...eslintCommentsRules,
      ...importRules,
      ...sortingRules,
      // Application code uses named exports only.
      "import-x/no-default-export": "error",

      // -----------------------------------------------------------------------
      // TYPESCRIPT
      // -----------------------------------------------------------------------
      // Prevents await on a value that is not a Promise or Thenable.
      "@typescript-eslint/await-thenable": "error",
      // Uses `import { type Foo }` so type imports do not create runtime imports.
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          fixStyle: "inline-type-imports",
          prefer: "type-imports",
        },
      ],
      // Prevents explicit any.
      "@typescript-eslint/no-explicit-any": "error",
      // A Promise cannot be created and forgotten; intentional omission requires void.
      "@typescript-eslint/no-floating-promises": "error",
      // Prevents async callbacks where the caller does not await a Promise.
      "@typescript-eslint/no-misused-promises": "error",
      // Prevents hiding null or undefined with the postfix `!` operator.
      "@typescript-eslint/no-non-null-assertion": "error",
      // Detects conditions that are always true or false according to their types.
      "@typescript-eslint/no-unnecessary-condition": "error",
      // Requires type exports to be explicitly separated.
      "@typescript-eslint/consistent-type-exports": "error",
      // Interfaces and type aliases use PascalCase, but the I prefix is forbidden:
      // UserProps is valid; IUserProps is an error.
      "@typescript-eslint/naming-convention": [
        "error",
        {
          custom: {
            match: false,
            regex: "^I[A-Z]",
          },
          format: ["PascalCase"],
          selector: ["interface", "typeAlias"],
        },
      ],
      // Prevents passing any to a typed function.
      "@typescript-eslint/no-unsafe-argument": "error",
      // Prevents assigning any to a typed variable.
      "@typescript-eslint/no-unsafe-assignment": "error",
      // Prevents calling a value of type any.
      "@typescript-eslint/no-unsafe-call": "error",
      // Prevents reading properties from a value of type any.
      "@typescript-eslint/no-unsafe-member-access": "error",
      // Prevents returning any from a typed function.
      "@typescript-eslint/no-unsafe-return": "error",
      // Preserves correct error flow for return await inside try/catch.
      "@typescript-eslint/return-await": ["error", "in-try-catch"],
      // Requires explicit boolean conditions instead of implicit truthy/falsy logic if off.
      "@typescript-eslint/strict-boolean-expressions": "off",
      // Requires switch statements to handle every union or enum value.
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      // Allow to trow Response for better handling/dividing errors
      "@typescript-eslint/only-throw-error": ["error", { allow: ["Response"] }],

      // -----------------------------------------------------------------------
      // GENERAL SECURITY AND DIAGNOSTICS
      // -----------------------------------------------------------------------
      // Disallows console.log; warn and error remain available for meaningful diagnostics.
      "no-console": ["error", { allow: ["warn", "error"] }],
      // Restricts MUI barrel, private, and legacy imports.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              importNames: ["makeStyles", "withStyles"],
              message: "Use styled() or the sx prop instead of the legacy JSS API.",
              name: "@mui/material/styles",
            },
            {
              message: "Use styled() or the sx prop instead of the legacy @mui/styles package.",
              name: "@mui/styles",
            },
          ],
          patterns: [
            {
              message: "Use a second-level MUI path import.",
              regex: "^@mui/(?!x-data-grid$)[^/]+$",
            },
            {
              message: "Third-level MUI imports are private and unsupported.",
              regex: "^@mui/[^/]+/[^/]+/.+",
            },
            {
              message: "Private MUI packages are unsupported.",
              regex: "^@mui/private-",
            },
          ],
        },
      ],
      // Effect dependencies must include every referenced value.
      "react-hooks/exhaustive-deps": "error",
      // Prevents libraries and APIs incompatible with React Compiler memoization.
      "react-hooks/incompatible-library": "error",
      // Flags potentially unsafe dynamic object[key] access.
      "security/detect-object-injection": "error",

      // -----------------------------------------------------------------------
      // UNICORN
      // -----------------------------------------------------------------------
      // Nested functions remain allowed when they make React code easier to read.
      "unicorn/consistent-function-scoping": "off",
      // All file names must use kebab-case.
      "unicorn/filename-case": ["error", { case: "kebabCase" }],
      // Array.reduce is allowed; banning it is an opinionated style preference.
      "unicorn/no-array-reduce": "off",
      // null is allowed because DOM and external APIs use it extensively.
      "unicorn/no-null": "off",
      // Do not automatically rename props, args, and other familiar abbreviations.
      "unicorn/name-replacements": [
        "error",
        {
          replacements: {
            env: false,
            params: false,
            props: false,
          },
        },
      ],

      // -----------------------------------------------------------------------
      // SONARJS
      // -----------------------------------------------------------------------
      // React props are destructured, so this rule provides no value here.
      "sonarjs/prefer-read-only-props": "off",
      // TODOs can be used for some delayed stuff.
      "sonarjs/todo-tag": "off",
    },
  },

]);

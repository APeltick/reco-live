# Code quality configuration

This project uses ESLint as the formatter and linter for JavaScript, TypeScript, and JSX. Prettier is intentionally not installed. Stylelint validates plain CSS and CSS inside Emotion tagged templates, while TypeScript provides strict compile-time checks.

`package.json` is strict JSON, so it cannot contain comments: npm would reject it. The reasoning for package scripts, dependencies, and browser support therefore lives in this documentation.

## Configuration files

| File | Responsibility |
| --- | --- |
| `eslint.config.js` | Flat ESLint configuration for config files, Vite tooling, and application source. |
| `stylelint.config.js` | Linting for CSS files and Emotion tagged templates. |
| `tsconfig.base.json` | Shared strict TypeScript policy. |
| `tsconfig.app.json` | Browser application compiler settings. |
| `tsconfig.node.json` | Node.js settings for `vite.config.ts`. |
| `vite.config.ts` | Vite, React, MUI styling-engine, browser target, and local-server settings. |
| `.npmrc` | Saves dependency versions exactly. |
| `.node-version` | Declares the expected Node.js release. |

## ESLint scopes

### JavaScript tooling

`eslint.config.js` and `stylelint.config.js` run in Node.js. They use ESLint's recommended JavaScript checks, Node.js globals, and ESLint Stylistic formatting.

### TypeScript tooling

`vite.config.ts` uses strict type-aware TypeScript rules, import validation and sorting, and Node.js globals. Default exports are allowed here because Vite's configuration API requires one.

### Application code

`src/**/*.{ts,tsx}` combines the following layers:

| Layer | Responsibility |
| --- | --- |
| `@eslint/js` | Baseline JavaScript errors such as unreachable code and invalid globals. |
| `typescript-eslint` | Strict, type-aware TypeScript correctness and style checks. |
| `import-x` | Import/export validity, cycles, duplicates, package boundaries, and TypeScript resolution. |
| `perfectionist` | Deterministic import and export sorting. |
| `react-x`, `react-dom`, `react-hooks`, `react-refresh` | React component, DOM, Hooks, React Compiler, and Vite Fast Refresh checks. |
| `jsx-a11y` | Strict static JSX accessibility checks, with MUI Button/Link and polymorphic `component` support. |
| `unicorn` | Modern JavaScript correctness and best-practice checks. |
| `regexp` | Regular-expression correctness and safety. |
| `sonarjs` | Cognitive complexity, duplicated branches, code smells, and suspicious logic. |
| `security`, `no-unsanitized` | Common unsafe JavaScript patterns and unsafe DOM HTML writes. |
| `compat` | Browser API support against the `browserslist` declared in `package.json`. |
| `@stylistic` | Formatting rules for JavaScript, TypeScript, and JSX. |

## Local policies

The configuration adds explicit project rules on top of those presets:

- Named exports are required in `src/`; tooling files may use a default export when their API requires it or when other naming is required by other framework, library etc.
- File names must use kebab-case for all except when other naming is required by other framework, library etc.
- Type aliases and interfaces use PascalCase without an `I` prefix.
- `console.log` is rejected; `console.warn` and `console.error` remain available for meaningful diagnostics.
- Legacy, private, overly broad, and unsupported MUI imports are rejected.
- ⚠️ Inline ESLint disables must be scoped, paired, used and ALSO be detailed documented why it is disabled ⚠️

## Accessibility

The strict `jsx-a11y` preset checks static JSX for labels, ARIA attributes and roles, anchors, keyboard interaction, focusability, headings, media captions, and document language. It additionally rejects ambiguous link text and focusable elements hidden from assistive technology.

Static linting cannot verify color contrast, focus order, focus traps, or actual screen-reader behavior.

## Stylelint and Emotion

Stylelint checks plain CSS directly and uses `postcss-styled-syntax` to extract CSS from Emotion `styled` and `css` tagged templates in TypeScript and TSX files. It applies the standard Stylelint preset and additionally rejects named colors, `!important`, ID selectors, and selectors with specificity above `0,3,0`.

MUI `sx`, object-based `styled(Component)({ ... })`, and `<GlobalStyles styles={{ ... }} />` are JavaScript object syntax, not CSS templates. Stylelint cannot parse them; TypeScript and ESLint still check the surrounding code. Use tagged-template styles when a declaration must be checked by Stylelint.

## TypeScript policy

The shared TypeScript configuration enables `strict` mode plus checks for unchecked indexed access, exact optional properties, missing overrides and returns, switch fallthrough, unused declarations, import casing, isolated modules, and no emitted JavaScript. The browser and tooling configurations then add their runtime-specific libraries, module resolution, and type declarations.

#### ⚠️⚠️⚠️ TS DISABLE RULES ⚠️⚠️⚠️

DON'T use `any` type and eslint disable for it, if for some reasons it really necessary, pls read bellow how to comment/document it.  

TypeScript error-suppression comments are exceptional escape hatches, not a normal way to fix type errors.
Use @ts-expect-error instead of @ts-ignore. @ts-ignore hides any TypeScript error on the next line, including unrelated future errors. @ts-expect-error is self-checking: TypeScript reports an error when the expected error no longer exists.

Every @ts-expect-error must include a meaningful explanation of:
- what TypeScript reports;
- why the code is valid or intentionally required;
- why a proper type fix is not currently possible;
- which upstream issue or documentation explains the limitation, when applicable.

Prefer a type augmentation, local declaration, wrapper, type guard, dependency upgrade, or a narrower type assertion before using a directive.
File-wide suppression through @ts-nocheck is not allowed.


## Quality gate

```sh
npm run check
```

The command runs type checking, ESLint, Stylelint, and a production build. ESLint is configured with `--max-warnings 0`, so warnings also fail the gate.

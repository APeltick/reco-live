# npm commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Starts the Vite development server with Hot Module Replacement. |
| `npm run typecheck` | Runs TypeScript project-reference type checking without emitting files. |
| `npm run lint:eslint` | Runs ESLint with a content-based cache and fails when any warning is reported. |
| `npm run lint:eslint:fix` | Runs ESLint and applies safe automatic fixes. Review the resulting diff. |
| `npm run lint:styles` | Runs Stylelint against CSS files and CSS tagged templates in TypeScript and TSX source files. |
| `npm run lint:styles:fix` | Runs Stylelint and applies automatic CSS fixes where available. Review the resulting diff. |
| `npm run lint` | Runs ESLint followed by Stylelint. |
| `npm run build` | Type-checks the project and creates a Vite production build in `dist/`. |
| `npm run preview` | Serves the existing production build locally. |
| `npm run audit` | Reports dependency vulnerabilities with severity `high` or `critical`. |
| `npm run check` | Runs type checking, both linters, and the production build. This is the local quality gate. |

## Recommended workflow

```sh
npm run dev
```

Before sharing the result:

```sh
npm run check
npm run audit
```

Git hooks run these checks automatically; see the [hook flow and peer-dependency policy](../hooks/README.md).

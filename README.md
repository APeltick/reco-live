# Draft frontend template

A strict React single-page application template for building maintainable client-side interfaces.

## Stack

- React 19 and TypeScript 6
- Vite 8
- Material UI 9 with Emotion
- ESLint 10 with type-aware, React, accessibility, security, and compatibility checks
- Stylelint for CSS files and Emotion tagged templates

## Quick start

⚠️ The current `--legacy-peer-deps` exception and its removal criteria are documented in [Known dependency issues](docs/issues/README.md). Add future unresolved issues there using the documented template. ⚠️
```sh
npm ci --legacy-peer-deps
npm run dev
```

The development server is available only on `127.0.0.1`. Vite prints the exact URL and port after startup.

Before opening a pull request or submitting the project, run:

```sh
npm run check
```

## Project conventions

- Application code lives in `src/`.
- Application modules use named exports and kebab-case file names.
- ESLint formats JavaScript, TypeScript, and JSX; Prettier is not used.
- Stylelint validates CSS files and CSS written in Emotion tagged templates.
- TypeScript runs with strict compiler settings.

## Documentation

- [Installation](docs/installation/README.md)
- [Development server and production preview](docs/development/README.md)
- [Known dependency issues](docs/issues/README.md)
- [All npm commands](docs/commands/README.md)
- [Git hooks and peer-dependency policy](docs/hooks/README.md)
- [package.json reference](docs/package/README.md)
- [ESLint, Stylelint, and TypeScript quality configuration](docs/eslint/README.md)

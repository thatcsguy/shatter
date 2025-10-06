# Repository Guidelines

## Project Structure & Module Organization
Shatter is a Vite + TypeScript playground for a Three.js-driven arena. Runtime entry `src/main.ts` wires Vite hydration into the game loop in `src/app/core`. Game logic lives in `src/app/entities` (component, system, world primitives) with supporting modules in `src/app/rendering`, `src/app/input`, and opt-in overlays under `src/app/debug`. Playable class implementations belong in `src/app/core/classes/`. Scene configuration defaults sit in `src/config/` with encounter definitions organized under `src/config/encounters/`, styles in `src/styles/global.css`, and long-form reference material in `docs/`. Place new reusable assets in `src/assets/` and keep binary exports outside `src/app`.

## Build, Test, and Development Commands
- `npm run dev`: start Vite dev server with hot reload; pair with the debug overlay to inspect entities.
- `npm run build`: produce an optimized bundle in `dist/`; run before shipping new mechanics.
- `npm run preview`: serve the built bundle locally for parity checks.
- `npm run lint`: run ESLint with TypeScript rules and type-aware checks.

## Coding Style & Naming Conventions
Use TypeScript modules (`.ts`/`.tsx`) and keep folder names lowercase or dashed for multiword segments. Classes and Three.js abstractions use `PascalCase`; functions, variables, and component factories use `camelCase`. Rely on Prettier defaults (`printWidth` 100, double quotes, trailing commas) and never skip semicolons. ESLint enforces type-only imports and promise safety; fix violations instead of suppressing them. Commit type definitions and configuration alongside the code they support.

## Testing Guidelines
Automated tests are not yet present; before merging complex changes, add Vitest specs and register a `test` script in `package.json`. Co-locate unit tests near the code under test as `*.spec.ts` files, mocking Three.js primitives sparingly. Validate rendering changes by running `npm run dev` and capturing animated evidence in the PR when behavior shifts. Treat manual test notes as temporary; upgrade them to repeatable scripts quickly.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`feat:`, `fix:`, `chore:`) in the imperative mood; scope optional but recommended for module families (`feat(core):`). Rebase before raising a PR, and describe the gameplay or rendering impact in bullets. Link issues or TODO references from `docs/todo.md`, and attach screenshots or short clips for visual changes. Request review from another agent whenever touching `src/app/core` or `src/app/entities`, and confirm `npm run build && npm run lint` in the PR checklist.

## Debug & Operational Tips
Toggle developer aids via the modules in `src/app/debug`; keep instrumentation behind a `DEBUG` flag exported from `src/config/arena.ts`. When profiling, use `frameTimer.ts` logging and document findings in `docs/technical-foundations.md`. Restore any temporary console output before merging.

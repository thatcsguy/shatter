# Technical Foundations

## Stack Selections
- **Language & Runtime**: TypeScript targeting ES2022, bundled for browsers supporting ES modules.
- **Renderer**: three.js (latest stable) for WebGL2 rendering.
- **Application Bundler**: Vite for dev server, fast HMR, and production bundling.
- **State Architecture**: Entity-Component-System (ECS) pattern implemented in-house with modular systems.
- **Testing**: TBD; initial milestones rely on manual playtesting until automated harnesses are introduced.
- **Linting & Formatting**: ESLint with TypeScript support and Prettier integration.

## Project Layout (Initial)
```
shatter/
├─ docs/
│  ├─ README.md
│  ├─ todo.md
│  └─ vision.md
├─ src/
│  ├─ main.ts
│  ├─ app/
│  │  ├─ core/
│  │  │  ├─ ecs/
│  │  │  └─ utils/
│  │  ├─ rendering/
│  │  └─ input/
│  └─ styles/
├─ public/
│  └─ favicon.svg
├─ index.html
├─ package.json
├─ tsconfig.json
├─ tsconfig.app.json
├─ tsconfig.node.json
├─ vite.config.ts
├─ eslint.config.js
└─ .prettierrc.json
```

## Configuration Philosophy
- Split TypeScript configs for app vs tooling to reduce compile overhead.
- Public assets served from `public/`; authored assets use organized subfolders.
- Shared constants kept under `src/app/core` with barrel exports for ergonomic imports.

## Asset Pipeline
- Use Vite static asset handling for textures/audio; importable via `new URL("./path", import.meta.url)`.
- Adopt GLTF/GLB for 3D models and Lottie/APNG for VFX placeholders later.
- Store temporary prototype art in `public/placeholder/`; replace with final assets later.

## Configuration Format
- Encounter, class, and arena data authored as JSON with zod validation.
- Shared schema definitions exported from `src/app/core/schema` for reuse client/server.
- Provide CLI validators (future) to lint configs before committing.

## Dependencies Baseline
- `three`
- `@types/three`
- `vite`
- `typescript`
- `@vitejs/plugin-react` (not needed) -> Instead `@vitejs/plugin-legacy` optional? For pure TS we can use `@vitejs/plugin-basic-ssl` optional. Actually we need `@vitejs/plugin-react`? Probably not. We just need `@vitejs/plugin-basic-ssl`? Eh not necessary. Keep minimal: `@vitejs/plugin-legacy`? maybe not. Instead we might use Vite's default `ts` config.
- `eslint`
- `@typescript-eslint/eslint-plugin`
- `@typescript-eslint/parser`
- `eslint-config-prettier`
- `prettier`

## Tooling Roadmap
- Add commit hooks via Husky/lint-staged once repo matures.
- Integrate Playwright for e2e validation when UI stabilizes.
- Investigate storybook-style harness for mechanic prototyping.

## Next Steps
1. Scaffold Vite project with TypeScript template.
2. Configure linting scripts in `package.json`.
3. Author initial ECS + rendering skeleton.
4. Automate schema validation pipeline.

## Debug Utilities
- F1 toggles the in-game debug overlay (FPS, frame delta, player position, speed).
- F2 resets the player to the arena origin for quick scenario testing.
- Game loop stats are smoothed via an exponential frame timer to avoid jitter.



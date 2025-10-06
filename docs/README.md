# Shatter

## Vision & Pillars
- Top-down arena boss battle inspired by MMO raids.
- Modular content pipeline for classes, abilities, mechanics, bosses, and arenas.
- Smooth solo prototype today; scalable to 4-player online co-op tomorrow.

## Early Scope
- Single-player encounter loop for rapid iteration.
- One arena, one boss, and a starter roster of simple classes.
- Desktop browser target with three.js rendering and keyboard input.

## Long-term Goals
- WebSocket-based multiplayer supporting four players per encounter.
- Deterministic simulation with client-side prediction and rollback netcode.
- Expandable tooling for encounter design, class balancing, and community content.

## Technical Direction
- Tech stack: TypeScript, three.js, modern bundler (Vite/Webpack), linting/testing.
- Static top-down camera showing entire arena; WASD movement with responsive input.
- Component-driven architecture (ECS or similar) for entities and mechanics.
- Data-driven configurations (JSON/YAML) for classes, abilities, bosses, and arenas.

## Content Philosophy
- Mechanics emphasize coordination (stack/spread, pairings, positional puzzles).
- Players visualized as circles; clear telegraphs and UI cues for mechanics.
- Accessibility-first approach: colorblind-safe palettes, readable prompts, audio cues.

## Tooling & Workflow
- Hot reload or quick reload for configuration changes.
- Debug overlay for state inspection, logging, and mechanic testing.
- Automated tests for simulation correctness and regression prevention.

## Roadmap Context
See `docs/todo.md` for the actionable breakdown of upcoming work.
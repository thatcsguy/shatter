# Shatter Todo

## 1. Vision & Constraints
- [x] Document design pillars, scope of solo prototype vs future multiplayer, and success criteria (docs/vision.md).

## 2. Technical Foundations
- [x] Select tech stack (TypeScript, three.js, Vite) and project structure (docs/technical-foundations.md).
- [x] Configure linting and formatting scripts (ESLint, Prettier); automated testing deferred until strategy defined.
- [ ] Establish shared math/util modules and configuration schema (JSON/YAML) for broader content support.

## 3. Rendering & Input Prototype
- [x] Build static square arena with top-down orthographic camera sized to the viewport.
- [x] Implement render loop, resize handling, and smoothed frame timing utilities.
- [x] Add WASD movement with acceleration/friction, arena boundary clamping, and debug controls (F1 overlay, F2 reset).

## 4. Entity Framework
- Choose ECS/component-based system for entities and mechanics.
- Define entity lifecycle, state updates, and collision/overlap detection.
- Implement spatial queries and animation/telegraph helpers.

## 5. Player Module
- Create data-driven class definitions (stats, abilities, cooldowns).
- Build action bar UI, cooldown/resource management, and targeting/reticle system.
- Integrate audio/FX hooks and developer tuning/debugging tools.

## 6. Boss & Mechanics Framework
- Develop encounter scripting with phases, triggers, and scheduling.
- Implement mechanic primitives: stack/spread, lines, AOEs, tethers, safe zones.
- Add telegraph visualization, fail-state handling, and boss AI behaviors.

## 7. Combat Systems
- Establish damage, healing, mitigation, and threat/aggro loop.
- Support status effects, buffs/debuffs, logs, and death/revive flow.
- Implement encounter reset and retry logic.

## 8. UX & Feedback
- Design HUD (health bars, cooldown timers, mechanic prompts).
- Show encounter timelines, warnings, and error messaging.
- Address accessibility (colorblind palettes, audio cues, readability).

## 9. Configuration & Extensibility
- Build schema validation and automated tests for JSON configs.
- Support hot reload/quick reload for content edits.
- Document templates for classes, bosses, mechanics, and arenas.

## 10. Tooling & Debugging
- [x] Implement initial in-engine debug overlay (FPS, frame delta, position, speed).
- Add time controls (pause/slow-motion) and manual mechanic spawning.
- Capture replays/logs for analysis and regression tests.

## 11. Single-player Milestone
- Ship solo fight: one class vs one boss with multiple mechanics.
- Implement victory/defeat flow and onboarding/tutorial UX.
- Package for simple local play (static hosting instructions).

## 12. Multiplayer Groundwork
- Abstract input/state handling for remote players.
- Draft messaging protocol and authoritative server approach.
- Create WebSocket lobby placeholder and connection lifecycle.

## 13. Networking Prototype
- Build minimal Node.js server syncing state over WebSockets.
- Integrate network loop with client simulation and latency simulation tools.
- Prepare data structures for prediction-ready inputs/state.

## 14. Prediction & Rollback Roadmap
- Research deterministic simulation requirements and input buffering.
- Plan state snapshotting/serialization and rollback test harness.
- Identify non-deterministic hotspots needing refactors.

## 15. QA & Testing
- Add unit tests for math/utilities and simulation logic.
- Build integration tests for encounter scripts and mechanics sequences.
- Profile performance and establish regression checklist.

## 16. Documentation & Knowledge Base
- Maintain living design doc, onboarding guide, and scripting reference.
- Share class design playbook and contribution guidelines.
- Track open questions and decision log for future contributors.

## 17. Future Iterations
- Plan multiplayer UX (matchmaking, chat, ready checks) and live-service features.
- Expand art/audio pipeline and community tooling (log parser, encounter planner).
- Research server scaling, persistence, and long-term content delivery.

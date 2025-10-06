# Shatter Vision & Constraints

## Overview
Shatter is a browser-based boss battle experience inspired by MMO raid encounters. The project aims to deliver a modular playground for encounter design that can scale from a rapid solo prototype into a synchronized four-player online co-op game. The long-term goal is to support live-ops style content updates while keeping the core simulation deterministic enough for rollback netcode.

## Target Audience & Platforms
- Primary: Players familiar with raid-style mechanics who want a quick practice arena.
- Secondary: Designers and developers interested in building and testing custom encounters.
- Platform: Desktop browsers with WebGL2 support; mobile/tablet is a stretch goal.
- Input: Keyboard first (WASD movement, additional keys for abilities); controller support is optional later.

## Core Experience Pillars
1. **Strategic Clarity**: Mechanics communicate intent through telegraphs, UI callouts, and readable timing.
2. **Mechanical Depth**: Encounters chain mechanics that require positioning, timing, and cooperation.
3. **Modular Extensibility**: Classes, bosses, arenas, and mechanics can be authored through data and scripts.
4. **Approachable Iteration**: Developers can prototype and test mechanics quickly with debug tooling.
5. **Responsive Control**: Input feels tight and predictable even under network latency.

## Design Tenets
- Favor deterministic state updates to support prediction and rollback later.
- Expose encounter structure in data files to encourage contributor-driven content.
- Keep visual representations legible and abstract until art direction is defined.
- Defer complex progression systems (loot, XP) until combat loop is mature.

## Key Constraints
- **Technical**: Must run smoothly (60 FPS target) on mid-range laptops; WebGL2-only rendering; no heavy backend dependencies for solo play.
- **Network**: WebSocket-based communication; authoritative server approach is preferred for multiplayer; no UDP.
- **Production**: Small team bandwidth; documentation-first approach so other agents can contribute asynchronously.
- **Security**: Avoid exposing arbitrary code execution via mod tools; validate config files against schemas.

## Solo Prototype Scope (Milestone A)
- One arena rendered with static top-down camera.
- One playable class with two to three abilities and basic resource system.
- One boss encounter featuring three distinct mechanics (spread, stack, positional puzzle).
- Single-player loop with start, failure, retry, and completion flows.
- Minimal HUD (health bars, cooldowns, mechanic prompts) and keyboard controls.
- Local data storage for configurations; no user accounts or persistence.

### Out of Scope for Milestone A
- Networking, matchmaking, or multiple concurrent players.
- Persistent progression, loot, or cosmetic systems.
- Advanced audio design and bespoke art assets.
- Mobile or controller support.

## Multiplayer Expansion Scope (Milestone B)
- Add lobby and matchmaking flow for up to four players, using WebSockets.
- Introduce additional classes to encourage role diversity (tank, healer, DPS variants).
- Implement synchronized mechanic resolution and server-authoritative boss logic.
- Integrate client-side input prediction and rollback-aware state management.
- Add in-game communication aids (ready checks, mechanic callouts, minimal chat).

### Dependencies for Milestone B
- Deterministic simulation core and stable serialization format.
- Snapshot/rollback framework with automated testing harness.
- Server infrastructure (Node.js) capable of running authoritative encounter logic.
- Clear network protocol specification for inputs, state deltas, and mechanic events.

## Success Metrics
- **Qualitative**: Players report clear understanding of mechanics and feel in control; new contributors can author a mechanic following documentation in under one day.
- **Quantitative**: 60 FPS on target hardware; input-to-action latency under 100 ms in solo play; multiplayer latency feels acceptable (<150 ms effective after prediction).
- **Operational**: Automated tests cover core simulation and fail when mechanics regress; documentation kept up-to-date alongside features.

## Risks & Mitigations
- **Complexity Creep**: Prioritize framework features that unlock content creation; enforce milestone scopes.
- **Determinism Issues**: Adopt strict coding guidelines (avoid floating randomness, rely on seeded RNG) and invest early in simulation tests.
- **Network Latency**: Prototype prediction/rollback in parallel with multiplayer groundwork to avoid rework.
- **Tooling Overhead**: Build lightweight debug tooling first, expand based on actual pain points.

## Assumptions
- Players are comfortable using keyboard controls in browser environments.
- Team accepts a stylized/minimalist art direction until core mechanics are validated.
- Contributors can run Node.js tooling locally for build scripts and servers.

## Open Questions
- What cadence should encounter content releases follow once multiplayer is live?
- Do we need persistence for player preferences or loadouts in early milestones?
- How much authoring capability should be exposed to community vs internal tooling?

## Decision Log (Initial)
- Use TypeScript + three.js for client-side rendering and logic.
- Favor ECS-style architecture for maintainability and extensibility.
- Plan for WebSocket server written in Node.js with shared TypeScript types.
- Establish JSON as the primary content format with schema validation.

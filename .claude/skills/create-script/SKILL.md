---
name: create-script
description: Use this skill when creating a new encounter script for the script system.
---

Create a new encounter script following shatter's conventions. The script file goes in `src/server/scripts/`.

## Script Structure

Scripts follow a strict top-to-bottom layout:

1. **Imports** — `ARENA_SIZE` from shared/types, `Script` from scriptRunner
2. **Timing gaps** (tunable knobs) — relative durations that control pacing
3. **Computed absolute times** — derived from gaps, never hardcoded
4. **SCRIPT_DURATION** — computed from the last event time
5. **Mechanic constants** — distances, durations, counts (scale relative to `ARENA_SIZE` where appropriate)
6. **Script body** — exported async function using timeline

## Timing Pattern

```typescript
// --- Timing gaps (tunable knobs) ---
const SPAWN_GAP = 1000;
const TRIGGER_GAP = 2000;
const FIRST_TRIGGER_DELAY = 4000;

// --- Computed absolute times ---
const SPAWN_TIMES = [0, SPAWN_GAP, SPAWN_GAP * 2];
const TRIGGER_TIMES = [
  FIRST_TRIGGER_DELAY,
  FIRST_TRIGGER_DELAY + TRIGGER_GAP,
  FIRST_TRIGGER_DELAY + TRIGGER_GAP * 2,
];
const SCRIPT_DURATION = TRIGGER_TIMES[TRIGGER_TIMES.length - 1] + 1000;
```

Adjusting pacing should require changing a single gap constant, not rewriting multiple values.

## Script Body Pattern

Scripts are async functions closing over the runner via closure — not classes or config objects.

```typescript
export const myScript: Script = async (runner) => {
  // Schedule events on the timeline
  runner.at(TIME, () => {
    runner.spawn({ ... });
  });

  // Run the timeline to completion
  await runner.runTimeline({ duration: SCRIPT_DURATION });
};
```

## ScriptRunner API

| Method | Signature | Use |
|--------|-----------|-----|
| `spawn` | `(params: MechanicParams) => number` | Spawn a mechanic, returns ID |
| `at` | `(time: number, fn: () => void \| Promise<void>) => void` | Schedule at absolute time (ms from script start) |
| `runTimeline` | `(opts: { duration: number }) => Promise<void>` | Execute timeline to completion |
| `wait` | `(ms: number) => Promise<void>` | Imperative sleep |
| `waitForResolve` | `(id: number) => Promise<MechanicResult>` | Wait for mechanic resolution, get hit data |
| `run` | `(script: Script) => Promise<void>` | Run sub-script with isolated timeline |

The second argument `ctx: ScriptContext` provides `getPlayers()` for targeting.

## Available Mechanic Types

**radialKnockback**
```typescript
runner.spawn({
  type: 'radialKnockback',
  x: number,           // origin X
  z: number,           // origin Z
  triggerAt?: number,   // absolute ms from script start when mechanic resolves
  knockbackDistance?: number,  // default: 8
  knockbackDuration?: number,  // default: 500ms
});
```

`triggerAt` converts to a delay internally. Omit it for immediate trigger after default delay (3000ms).

## Available Selectors

Import from `./selectors.js`:

| Factory | Returns | Description |
|---------|---------|-------------|
| `all()` | All players | Copy of full player list |
| `random(n)` | n random players | Fisher-Yates shuffle |
| `closest(point)` | 1 nearest player | By Euclidean distance (x, z) |
| `furthest(point)` | 1 farthest player | By Euclidean distance (x, z) |
| `nClosest(n, point)` | n nearest players | Sorted by distance |
| `nFurthest(n, point)` | n farthest players | Sorted by distance |

Point is `{ x: number; z: number }`. All selectors return `Player[]`.

## Game Constants

- `ARENA_SIZE = 40` — scale mechanic distances relative to this (e.g., `ARENA_SIZE * 0.3`)
- Arena spans from 0 to ARENA_SIZE in both X and Z

## Wiring the Script

After creating the script file:

1. Import it in `src/server/game.ts`
2. Add it to the script registry in `Game`'s constructor
3. Add an admin button in `src/client/hud.ts` that emits `admin:runScript` with the script name

## Resolution Patterns

- **Knockback**: Self-resolving — the mechanic applies knockback directly to players. Scripts don't need to handle the result.
- **Future mechanics**: Will return `MechanicResult` with hit data via `waitForResolve(id)`. Scripts decide effects based on who was hit.

import { ARENA_SIZE } from '../../shared/types.js';
import type { Script } from './scriptRunner.js';

// --- Timing gaps (tunable knobs) ---
const SPAWN_GAP = 1000;
const TRIGGER_GAP = 2000;
const FIRST_TRIGGER_DELAY = 4000;

// --- Computed absolute times ---
const SPAWN_TIMES = [0, SPAWN_GAP, SPAWN_GAP * 2, SPAWN_GAP * 3];
const TRIGGER_TIMES = [
  FIRST_TRIGGER_DELAY,
  FIRST_TRIGGER_DELAY + TRIGGER_GAP,
  FIRST_TRIGGER_DELAY + TRIGGER_GAP * 2,
  FIRST_TRIGGER_DELAY + TRIGGER_GAP * 3,
];
const SCRIPT_DURATION = TRIGGER_TIMES[TRIGGER_TIMES.length - 1] + 1000;

// --- Mechanic constants ---
const KNOCKBACK_DISTANCE = ARENA_SIZE * 0.3; // 30% of arena width
const KNOCKBACK_DURATION = 1000;
const NUM_KNOCKBACKS = 4;

// --- Script ---
export const knockfestScript: Script = async (runner) => {
  for (let i = 0; i < NUM_KNOCKBACKS; i++) {
    const x = Math.random() * ARENA_SIZE;
    const z = Math.random() * ARENA_SIZE;

    runner.at(SPAWN_TIMES[i], () => {
      runner.spawn({
        type: 'radialKnockback',
        x,
        z,
        triggerAt: TRIGGER_TIMES[i],
        knockbackDistance: KNOCKBACK_DISTANCE,
        knockbackDuration: KNOCKBACK_DURATION,
      });
    });
  }

  await runner.runTimeline({ duration: SCRIPT_DURATION });
};

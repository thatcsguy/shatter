import type { MechanicManager, MechanicResult } from '../mechanics/mechanicManager.js';
import type { BaseMechanic } from '../mechanics/baseMechanic.js';
import type { Player } from '../player.js';

export interface MechanicParams {
  type: 'radialKnockback';
  x: number;
  z: number;
  triggerAt?: number;
  knockbackDistance?: number;
  knockbackDuration?: number;
}

export interface ScriptContext {
  getPlayers(): Player[];
}

export interface ScriptRunner {
  spawn(params: MechanicParams): number;
  wait(ms: number): Promise<void>;
  waitForResolve(id: number): Promise<MechanicResult>;
  at(time: number, fn: () => void | Promise<void>): void;
  runTimeline(opts: { duration: number }): Promise<void>;
  run(script: Script): Promise<void>;
}

export type Script = (runner: ScriptRunner, ctx: ScriptContext) => Promise<void>;

interface TimelineEntry {
  time: number;
  fn: () => void | Promise<void>;
}

export class ScriptRunnerImpl implements ScriptRunner {
  private timeline: TimelineEntry[] = [];
  private scriptStartTime: number;

  constructor(
    private mechanicManager: MechanicManager,
    private mechanicFactory: MechanicFactory,
    private ctx: ScriptContext,
    startTime?: number,
  ) {
    this.scriptStartTime = startTime ?? Date.now();
  }

  spawn(params: MechanicParams): number {
    const now = Date.now();

    let delay: number | undefined;
    if (params.triggerAt != null) {
      const triggerTimestamp = this.scriptStartTime + params.triggerAt;
      delay = Math.max(0, triggerTimestamp - now);
    }

    const mechanic = this.mechanicFactory.create(params, now, delay);
    return this.mechanicManager.add(mechanic);
  }

  wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  waitForResolve(id: number): Promise<MechanicResult> {
    return this.mechanicManager.onResolve(id);
  }

  at(time: number, fn: () => void | Promise<void>): void {
    this.timeline.push({ time, fn });
  }

  async runTimeline(opts: { duration: number }): Promise<void> {
    const startTime = Date.now();

    while (true) {
      const elapsed = Date.now() - startTime;
      if (elapsed >= opts.duration) break;

      // Sort to support dynamic scheduling
      this.timeline.sort((a, b) => a.time - b.time);

      // Find next ready entry
      const idx = this.timeline.findIndex((e) => e.time <= elapsed);
      if (idx === -1) {
        // Sleep until next entry or end
        const nextTime = this.timeline.length > 0 ? this.timeline[0].time : opts.duration;
        const sleepMs = Math.max(1, nextTime - elapsed);
        await this.wait(Math.min(sleepMs, opts.duration - elapsed));
        continue;
      }

      const entry = this.timeline.splice(idx, 1)[0];
      await entry.fn();
    }
  }

  async run(script: Script): Promise<void> {
    const childRunner = new ScriptRunnerImpl(
      this.mechanicManager,
      this.mechanicFactory,
      this.ctx,
      Date.now(),
    );
    await script(childRunner, this.ctx);
  }
}

export interface MechanicFactory {
  create(params: MechanicParams, now: number, delay?: number): BaseMechanic;
}

export function runEncounter(
  mechanicManager: MechanicManager,
  mechanicFactory: MechanicFactory,
  ctx: ScriptContext,
  script: Script,
): Promise<void> {
  const runner = new ScriptRunnerImpl(mechanicManager, mechanicFactory, ctx);
  return script(runner, ctx);
}

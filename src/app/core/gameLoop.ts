import { FrameTimer } from "@app/core/frameTimer";

export type GameLoopUpdate = (deltaTime: number, rawDelta: number) => void;
export interface GameLoopStats {
  fps: number;
  delta: number;
  rawDelta: number;
}
export type GameLoopStatsListener = (stats: GameLoopStats) => void;

export class GameLoop {
  private frameId: number | null = null;
  private readonly timer = new FrameTimer();
  private statsListener: GameLoopStatsListener | null = null;

  constructor(private readonly update: GameLoopUpdate) {}

  setStatsListener(listener: GameLoopStatsListener | null) {
    this.statsListener = listener;
  }

  start() {
    if (this.frameId !== null) return;
    this.timer.reset(performance.now());
    const tick = (time: number) => {
      const step = this.timer.step(time);
      this.update(step.delta, step.rawDelta);
      if (this.statsListener) {
        this.statsListener(step);
      }
      this.frameId = requestAnimationFrame(tick);
    };
    this.frameId = requestAnimationFrame(tick);
  }

  stop() {
    if (this.frameId === null) return;
    cancelAnimationFrame(this.frameId);
    this.frameId = null;
  }
}

export interface FrameStep {
  delta: number;
  rawDelta: number;
  fps: number;
}

export class FrameTimer {
  private lastTime = 0;
  private readonly smoothing;
  private fpsValue = 60;

  constructor(private readonly maxDelta = 1 / 30, smoothing = 0.1) {
    this.smoothing = Math.min(Math.max(smoothing, 0), 1);
  }

  reset(now: number) {
    this.lastTime = now;
    this.fpsValue = 60;
  }

  step(now: number): FrameStep {
    if (this.lastTime === 0) {
      this.reset(now);
      return { delta: 0, rawDelta: 0, fps: this.fpsValue };
    }

    const rawDelta = Math.max((now - this.lastTime) / 1000, 0);
    this.lastTime = now;
    const delta = Math.min(rawDelta, this.maxDelta);

    if (rawDelta > 0) {
      const instantFps = 1 / rawDelta;
      this.fpsValue += (instantFps - this.fpsValue) * this.smoothing;
    }

    return { delta, rawDelta, fps: this.fpsValue };
  }
}

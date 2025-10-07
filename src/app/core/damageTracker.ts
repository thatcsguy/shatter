const TRACK_DURATION_SECONDS = 60;

export interface DamageTrackerState {
  totalDamage: number;
  elapsed: number;
  duration: number;
  active: boolean;
  locked: boolean;
  dps: number;
}

export class DamageTracker {
  private totalDamage = 0;
  private elapsed = 0;
  private active = false;
  private locked = false;

  update(deltaTime: number) {
    if (!this.active || this.locked) {
      return;
    }

    this.elapsed = Math.min(this.elapsed + deltaTime, TRACK_DURATION_SECONDS);
    if (this.elapsed >= TRACK_DURATION_SECONDS) {
      this.locked = true;
    }
  }

  record(amount: number) {
    if (this.locked) {
      return;
    }

    if (!this.active) {
      this.active = true;
      this.elapsed = 0;
    }

    this.totalDamage += amount;
  }

  reset() {
    this.totalDamage = 0;
    this.elapsed = 0;
    this.active = false;
    this.locked = false;
  }

  getState(): DamageTrackerState {
    const effectiveDuration = this.locked ? TRACK_DURATION_SECONDS : this.elapsed;
    const dps = effectiveDuration > 0 ? this.totalDamage / effectiveDuration : 0;

    return {
      totalDamage: this.totalDamage,
      elapsed: this.locked ? TRACK_DURATION_SECONDS : this.elapsed,
      duration: TRACK_DURATION_SECONDS,
      active: this.active,
      locked: this.locked,
      dps
    };
  }
}

import type { BaseMechanic, MechanicState } from './baseMechanic.js';
import type { Player } from '../player.js';
import { getRadialKnockbackDirection } from '../../shared/knockback.js';

export const KNOCKBACK_DELAY = 3000;
export const KNOCKBACK_DISTANCE = 8;
export const KNOCKBACK_DURATION = 500;

export class RadialKnockbackMechanic implements BaseMechanic {
  readonly originX: number;
  readonly originZ: number;
  readonly startTime: number;
  readonly endTime: number;
  readonly knockbackDistance: number;
  readonly knockbackDuration: number;

  constructor(
    originX: number,
    originZ: number,
    now: number,
    delay: number = KNOCKBACK_DELAY,
    distance: number = KNOCKBACK_DISTANCE,
    duration: number = KNOCKBACK_DURATION,
  ) {
    this.originX = originX;
    this.originZ = originZ;
    this.startTime = now;
    this.endTime = now + delay;
    this.knockbackDistance = distance;
    this.knockbackDuration = duration;
  }

  tick(_now: number): void {
    // No per-tick logic needed for radial knockback during delay phase
  }

  isExpired(now: number): boolean {
    return now >= this.endTime;
  }

  resolve(players: Player[]): void {
    for (const player of players) {
      const { dirX, dirZ } = getRadialKnockbackDirection(
        this.originX,
        this.originZ,
        player.position.x,
        player.position.z,
      );
      player.applyKnockback(dirX, dirZ, this.knockbackDistance, this.knockbackDuration, this.endTime);
    }
  }

  toState(): MechanicState {
    return {
      type: 'radialKnockback',
      originX: this.originX,
      originZ: this.originZ,
      startTime: this.startTime,
      endTime: this.endTime,
    };
  }
}

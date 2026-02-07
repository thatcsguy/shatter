import type { BaseMechanic, MechanicState } from './baseMechanic.js';
import type { Player } from '../player.js';

export class MechanicManager {
  private mechanics: BaseMechanic[] = [];

  add(mechanic: BaseMechanic): void {
    this.mechanics.push(mechanic);
  }

  tick(now: number, players: Player[]): void {
    for (const mechanic of this.mechanics) {
      mechanic.tick(now);
    }

    const expired: BaseMechanic[] = [];
    for (const mechanic of this.mechanics) {
      if (mechanic.isExpired(now)) {
        expired.push(mechanic);
      }
    }

    for (const mechanic of expired) {
      mechanic.resolve(players);
    }

    this.mechanics = this.mechanics.filter((m) => !expired.includes(m));
  }

  getStates(): MechanicState[] {
    return this.mechanics.map((m) => m.toState());
  }
}

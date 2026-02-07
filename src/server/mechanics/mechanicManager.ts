import type { BaseMechanic, MechanicState } from './baseMechanic.js';
import type { Player } from '../player.js';

export interface MechanicResult {
  id: number;
  type: string;
  hitPlayerIds: string[];
}

export class MechanicManager {
  private mechanics: { id: number; mechanic: BaseMechanic }[] = [];
  private nextId = 1;
  private resolveCallbacks = new Map<number, (result: MechanicResult) => void>();

  add(mechanic: BaseMechanic): number {
    const id = this.nextId++;
    this.mechanics.push({ id, mechanic });
    return id;
  }

  onResolve(id: number): Promise<MechanicResult> {
    return new Promise((resolve) => {
      this.resolveCallbacks.set(id, resolve);
    });
  }

  tick(now: number, players: Player[]): void {
    for (const entry of this.mechanics) {
      entry.mechanic.tick(now);
    }

    const expired: { id: number; mechanic: BaseMechanic }[] = [];
    for (const entry of this.mechanics) {
      if (entry.mechanic.isExpired(now)) {
        expired.push(entry);
      }
    }

    for (const entry of expired) {
      entry.mechanic.resolve(players);

      const result: MechanicResult = {
        id: entry.id,
        type: entry.mechanic.toState().type,
        hitPlayerIds: players.map((p) => p.id),
      };

      const cb = this.resolveCallbacks.get(entry.id);
      if (cb) {
        cb(result);
        this.resolveCallbacks.delete(entry.id);
      }
    }

    this.mechanics = this.mechanics.filter((e) => !expired.includes(e));
  }

  getStates(): MechanicState[] {
    return this.mechanics.map((e) => e.mechanic.toState());
  }
}

import type { Player } from '../player.js';

export interface MechanicState {
  type: string;
  [key: string]: unknown;
}

export interface BaseMechanic {
  tick(now: number): void;
  isExpired(now: number): boolean;
  resolve(players: Player[]): void;
  toState(): MechanicState;
}

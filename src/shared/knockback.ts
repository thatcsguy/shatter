import { Vec3, ARENA_SIZE } from './types.js';

export interface KnockbackState {
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  startTime: number;
  duration: number;
}

export function easeOutCubic(t: number): number {
  return 1 - (1 - t) * (1 - t) * (1 - t);
}

export function getKnockbackPosition(
  kb: KnockbackState,
  now: number,
): { x: number; z: number; active: boolean } {
  const elapsed = now - kb.startTime;
  if (elapsed >= kb.duration) {
    return { x: kb.endX, z: kb.endZ, active: false };
  }
  const t = easeOutCubic(elapsed / kb.duration);
  return {
    x: kb.startX + (kb.endX - kb.startX) * t,
    z: kb.startZ + (kb.endZ - kb.startZ) * t,
    active: true,
  };
}

export function getRadialKnockbackDirection(
  originX: number,
  originZ: number,
  playerX: number,
  playerZ: number,
): { dirX: number; dirZ: number } {
  const dx = playerX - originX;
  const dz = playerZ - originZ;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 0.001) {
    return { dirX: 1, dirZ: 0 };
  }
  return { dirX: dx / len, dirZ: dz / len };
}

export function calculateKnockbackEndpoint(
  startX: number,
  startZ: number,
  dirX: number,
  dirZ: number,
  distance: number,
): { endX: number; endZ: number } {
  const endX = Math.max(0, Math.min(ARENA_SIZE, startX + dirX * distance));
  const endZ = Math.max(0, Math.min(ARENA_SIZE, startZ + dirZ * distance));
  return { endX, endZ };
}

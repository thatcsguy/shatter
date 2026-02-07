import { describe, it, expect } from 'vitest';
import {
  easeOutCubic,
  getKnockbackPosition,
  getRadialKnockbackDirection,
  calculateKnockbackEndpoint,
  KnockbackState,
} from '../knockback.js';
import { ARENA_SIZE } from '../types.js';

describe('easeOutCubic', () => {
  it('returns 0 at t=0', () => {
    expect(easeOutCubic(0)).toBe(0);
  });

  it('returns 1 at t=1', () => {
    expect(easeOutCubic(1)).toBe(1);
  });

  it('returns 0.5 < result < 1 at t=0.5', () => {
    const mid = easeOutCubic(0.5);
    expect(mid).toBeGreaterThan(0.5);
    expect(mid).toBeLessThan(1);
  });

  it('is monotonically increasing', () => {
    let prev = 0;
    for (let i = 1; i <= 10; i++) {
      const t = i / 10;
      const val = easeOutCubic(t);
      expect(val).toBeGreaterThan(prev);
      prev = val;
    }
  });
});

describe('getKnockbackPosition', () => {
  const kb: KnockbackState = {
    startX: 10,
    startZ: 10,
    endX: 18,
    endZ: 10,
    startTime: 1000,
    duration: 500,
  };

  it('returns start position at startTime', () => {
    const result = getKnockbackPosition(kb, 1000);
    expect(result.x).toBeCloseTo(10);
    expect(result.z).toBeCloseTo(10);
    expect(result.active).toBe(true);
  });

  it('returns end position with active=false after duration', () => {
    const result = getKnockbackPosition(kb, 1600);
    expect(result.x).toBeCloseTo(18);
    expect(result.z).toBeCloseTo(10);
    expect(result.active).toBe(false);
  });

  it('returns end position exactly at duration end', () => {
    const result = getKnockbackPosition(kb, 1500);
    expect(result.x).toBeCloseTo(18);
    expect(result.z).toBeCloseTo(10);
    expect(result.active).toBe(false);
  });

  it('interpolates at midpoint with easing', () => {
    const result = getKnockbackPosition(kb, 1250); // t=0.5
    const expectedT = easeOutCubic(0.5);
    expect(result.x).toBeCloseTo(10 + 8 * expectedT);
    expect(result.z).toBeCloseTo(10);
    expect(result.active).toBe(true);
  });
});

describe('getRadialKnockbackDirection', () => {
  it('returns direction to the right (+X) for player east of origin', () => {
    const { dirX, dirZ } = getRadialKnockbackDirection(10, 10, 15, 10);
    expect(dirX).toBeCloseTo(1);
    expect(dirZ).toBeCloseTo(0);
  });

  it('returns direction to the left (-X) for player west of origin', () => {
    const { dirX, dirZ } = getRadialKnockbackDirection(10, 10, 5, 10);
    expect(dirX).toBeCloseTo(-1);
    expect(dirZ).toBeCloseTo(0);
  });

  it('returns direction up (+Z) for player north of origin', () => {
    const { dirX, dirZ } = getRadialKnockbackDirection(10, 10, 10, 15);
    expect(dirX).toBeCloseTo(0);
    expect(dirZ).toBeCloseTo(1);
  });

  it('normalizes diagonal directions', () => {
    const { dirX, dirZ } = getRadialKnockbackDirection(0, 0, 3, 4);
    const len = Math.sqrt(dirX * dirX + dirZ * dirZ);
    expect(len).toBeCloseTo(1);
    expect(dirX).toBeCloseTo(3 / 5);
    expect(dirZ).toBeCloseTo(4 / 5);
  });

  it('returns fallback direction when player is at origin', () => {
    const { dirX, dirZ } = getRadialKnockbackDirection(10, 10, 10, 10);
    expect(dirX).toBe(1);
    expect(dirZ).toBe(0);
  });
});

describe('calculateKnockbackEndpoint', () => {
  it('calculates endpoint in the +X direction', () => {
    const { endX, endZ } = calculateKnockbackEndpoint(10, 20, 1, 0, 8);
    expect(endX).toBeCloseTo(18);
    expect(endZ).toBeCloseTo(20);
  });

  it('clamps to right wall', () => {
    const { endX, endZ } = calculateKnockbackEndpoint(35, 20, 1, 0, 8);
    expect(endX).toBe(ARENA_SIZE);
    expect(endZ).toBeCloseTo(20);
  });

  it('clamps to left wall', () => {
    const { endX, endZ } = calculateKnockbackEndpoint(3, 20, -1, 0, 8);
    expect(endX).toBe(0);
    expect(endZ).toBeCloseTo(20);
  });

  it('clamps to top wall (+Z)', () => {
    const { endX, endZ } = calculateKnockbackEndpoint(20, 37, 0, 1, 8);
    expect(endX).toBeCloseTo(20);
    expect(endZ).toBe(ARENA_SIZE);
  });

  it('clamps to bottom wall (-Z)', () => {
    const { endX, endZ } = calculateKnockbackEndpoint(20, 2, 0, -1, 8);
    expect(endX).toBeCloseTo(20);
    expect(endZ).toBe(0);
  });

  it('clamps to corner', () => {
    const { endX, endZ } = calculateKnockbackEndpoint(38, 38, 1, 1, 20);
    expect(endX).toBe(ARENA_SIZE);
    expect(endZ).toBe(ARENA_SIZE);
  });
});

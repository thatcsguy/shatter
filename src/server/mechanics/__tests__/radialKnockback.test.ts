import { describe, it, expect, vi } from 'vitest';
import { RadialKnockbackMechanic, KNOCKBACK_DELAY, KNOCKBACK_DISTANCE, KNOCKBACK_DURATION } from '../radialKnockback.js';
import { Player } from '../../player.js';

function makePlayer(id: string, x: number, z: number): Player {
  const player = new Player(id, 0xffffff);
  player.position.x = x;
  player.position.z = z;
  player.applyKnockback = vi.fn();
  return player;
}

describe('RadialKnockbackMechanic', () => {
  it('sets correct startTime and endTime from delay', () => {
    const m = new RadialKnockbackMechanic(10, 15, 5000);
    expect(m.startTime).toBe(5000);
    expect(m.endTime).toBe(5000 + KNOCKBACK_DELAY);
  });

  it('is not expired before endTime', () => {
    const m = new RadialKnockbackMechanic(10, 15, 5000);
    expect(m.isExpired(5000)).toBe(false);
    expect(m.isExpired(5000 + KNOCKBACK_DELAY - 1)).toBe(false);
  });

  it('is expired at endTime', () => {
    const m = new RadialKnockbackMechanic(10, 15, 5000);
    expect(m.isExpired(5000 + KNOCKBACK_DELAY)).toBe(true);
  });

  it('is expired after endTime', () => {
    const m = new RadialKnockbackMechanic(10, 15, 5000);
    expect(m.isExpired(5000 + KNOCKBACK_DELAY + 1000)).toBe(true);
  });

  it('resolve calls applyKnockback on all players with correct directions', () => {
    const m = new RadialKnockbackMechanic(10, 10, 5000);
    const p1 = makePlayer('p1', 15, 10); // east of origin
    const p2 = makePlayer('p2', 10, 15); // north of origin

    m.resolve([p1, p2]);

    expect(p1.applyKnockback).toHaveBeenCalledWith(
      expect.closeTo(1, 5),   // dirX: east
      expect.closeTo(0, 5),   // dirZ: 0
      KNOCKBACK_DISTANCE,
      KNOCKBACK_DURATION,
      m.endTime,
    );

    expect(p2.applyKnockback).toHaveBeenCalledWith(
      expect.closeTo(0, 5),   // dirX: 0
      expect.closeTo(1, 5),   // dirZ: north
      KNOCKBACK_DISTANCE,
      KNOCKBACK_DURATION,
      m.endTime,
    );
  });

  it('toState returns correct serialized shape', () => {
    const m = new RadialKnockbackMechanic(12, 25, 5000);
    const state = m.toState();
    expect(state).toEqual({
      type: 'radialKnockback',
      originX: 12,
      originZ: 25,
      startTime: 5000,
      endTime: 5000 + KNOCKBACK_DELAY,
    });
  });

  it('accepts custom delay, distance, and duration', () => {
    const m = new RadialKnockbackMechanic(10, 10, 5000, 1000, 12, 800);
    expect(m.endTime).toBe(6000);
    expect(m.knockbackDistance).toBe(12);
    expect(m.knockbackDuration).toBe(800);
  });
});

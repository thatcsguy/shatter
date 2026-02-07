import { describe, it, expect } from 'vitest';
import { all, random, closest, furthest, nClosest, nFurthest } from '../selectors.js';
import type { Player } from '../../player.js';

function mockPlayer(id: string, x: number, z: number): Player {
  return {
    id,
    position: { x, y: 0, z },
  } as Player;
}

describe('selectors', () => {
  const alice = mockPlayer('alice', 0, 0);
  const bob = mockPlayer('bob', 3, 4); // distance 5 from origin
  const carol = mockPlayer('carol', 6, 8); // distance 10 from origin
  const dave = mockPlayer('dave', 9, 12); // distance 15 from origin
  const players = [alice, bob, carol, dave];

  describe('all', () => {
    it('returns all players', () => {
      expect(all()(players)).toEqual(players);
    });

    it('returns empty array for no players', () => {
      expect(all()([])).toEqual([]);
    });

    it('returns a copy, not the original array', () => {
      const result = all()(players);
      expect(result).not.toBe(players);
    });
  });

  describe('random', () => {
    it('returns n players', () => {
      const result = random(2)(players);
      expect(result).toHaveLength(2);
      for (const p of result) {
        expect(players).toContain(p);
      }
    });

    it('returns all players when n >= count', () => {
      const result = random(10)(players);
      expect(result).toHaveLength(4);
    });

    it('returns empty array for no players', () => {
      expect(random(3)([])).toEqual([]);
    });

    it('returns no duplicates', () => {
      const result = random(3)(players);
      const ids = result.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('closest', () => {
    it('returns the closest player to a point', () => {
      const result = closest({ x: 0, z: 0 })(players);
      expect(result).toEqual([alice]);
    });

    it('returns closest to a non-origin point', () => {
      const result = closest({ x: 6, z: 8 })(players);
      expect(result).toEqual([carol]);
    });

    it('returns empty array for no players', () => {
      expect(closest({ x: 0, z: 0 })([])).toEqual([]);
    });
  });

  describe('furthest', () => {
    it('returns the furthest player from a point', () => {
      const result = furthest({ x: 0, z: 0 })(players);
      expect(result).toEqual([dave]);
    });

    it('returns furthest from a non-origin point', () => {
      // From dave's position, alice is furthest
      const result = furthest({ x: 9, z: 12 })(players);
      expect(result).toEqual([alice]);
    });

    it('returns empty array for no players', () => {
      expect(furthest({ x: 0, z: 0 })([])).toEqual([]);
    });
  });

  describe('nClosest', () => {
    it('returns n closest players', () => {
      const result = nClosest(2, { x: 0, z: 0 })(players);
      expect(result.map((p) => p.id)).toEqual(['alice', 'bob']);
    });

    it('returns all players when n >= count', () => {
      const result = nClosest(10, { x: 0, z: 0 })(players);
      expect(result).toHaveLength(4);
    });

    it('returns empty array for no players', () => {
      expect(nClosest(2, { x: 0, z: 0 })([])).toEqual([]);
    });
  });

  describe('nFurthest', () => {
    it('returns n furthest players', () => {
      const result = nFurthest(2, { x: 0, z: 0 })(players);
      expect(result.map((p) => p.id)).toEqual(['dave', 'carol']);
    });

    it('returns all players when n >= count', () => {
      const result = nFurthest(10, { x: 0, z: 0 })(players);
      expect(result).toHaveLength(4);
    });

    it('returns empty array for no players', () => {
      expect(nFurthest(2, { x: 0, z: 0 })([])).toEqual([]);
    });
  });
});

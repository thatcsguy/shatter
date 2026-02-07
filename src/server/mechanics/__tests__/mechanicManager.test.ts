import { describe, it, expect, vi } from 'vitest';
import { MechanicManager } from '../mechanicManager.js';
import type { BaseMechanic, MechanicState } from '../baseMechanic.js';
import type { Player } from '../../player.js';

function createMockMechanic(overrides: Partial<BaseMechanic> = {}): BaseMechanic {
  return {
    tick: vi.fn(),
    isExpired: vi.fn().mockReturnValue(false),
    resolve: vi.fn(),
    toState: vi.fn().mockReturnValue({ type: 'mock' }),
    ...overrides,
  };
}

describe('MechanicManager', () => {
  it('ticks all active mechanics', () => {
    const manager = new MechanicManager();
    const m1 = createMockMechanic();
    const m2 = createMockMechanic();
    manager.add(m1);
    manager.add(m2);

    manager.tick(1000, []);
    expect(m1.tick).toHaveBeenCalledWith(1000);
    expect(m2.tick).toHaveBeenCalledWith(1000);
  });

  it('resolves and removes expired mechanics', () => {
    const manager = new MechanicManager();
    const m1 = createMockMechanic({
      isExpired: vi.fn().mockReturnValue(true),
    });
    const players = [{ id: 'p1' }] as Player[];
    manager.add(m1);

    manager.tick(1000, players);
    expect(m1.resolve).toHaveBeenCalledWith(players);
    expect(manager.getStates()).toEqual([]);
  });

  it('does not resolve non-expired mechanics', () => {
    const manager = new MechanicManager();
    const m1 = createMockMechanic();
    manager.add(m1);

    manager.tick(1000, []);
    expect(m1.resolve).not.toHaveBeenCalled();
  });

  it('returns states of active mechanics', () => {
    const manager = new MechanicManager();
    const state1: MechanicState = { type: 'a' };
    const state2: MechanicState = { type: 'b' };
    manager.add(createMockMechanic({ toState: vi.fn().mockReturnValue(state1) }));
    manager.add(createMockMechanic({ toState: vi.fn().mockReturnValue(state2) }));

    expect(manager.getStates()).toEqual([state1, state2]);
  });

  it('handles mix of expired and active mechanics', () => {
    const manager = new MechanicManager();
    const expired = createMockMechanic({
      isExpired: vi.fn().mockReturnValue(true),
      toState: vi.fn().mockReturnValue({ type: 'expired' }),
    });
    const active = createMockMechanic({
      toState: vi.fn().mockReturnValue({ type: 'active' }),
    });
    manager.add(expired);
    manager.add(active);

    manager.tick(1000, []);
    expect(expired.resolve).toHaveBeenCalled();
    expect(active.resolve).not.toHaveBeenCalled();
    expect(manager.getStates()).toEqual([{ type: 'active' }]);
  });
});

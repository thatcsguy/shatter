import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScriptRunnerImpl, type MechanicFactory, type MechanicParams, type ScriptContext } from '../scriptRunner.js';
import { MechanicManager } from '../../mechanics/mechanicManager.js';
import type { BaseMechanic, MechanicState } from '../../mechanics/baseMechanic.js';

function createMockMechanic(overrides: Partial<BaseMechanic> = {}): BaseMechanic {
  return {
    tick: vi.fn(),
    isExpired: vi.fn().mockReturnValue(false),
    resolve: vi.fn(),
    toState: vi.fn().mockReturnValue({ type: 'mock' }),
    ...overrides,
  };
}

function createMockFactory(): MechanicFactory & { created: MechanicParams[] } {
  const created: MechanicParams[] = [];
  return {
    created,
    create(params: MechanicParams, _now: number, _delay?: number): BaseMechanic {
      created.push(params);
      return createMockMechanic();
    },
  };
}

function createMockCtx(): ScriptContext {
  return { getPlayers: () => [] };
}

describe('ScriptRunnerImpl', () => {
  let manager: MechanicManager;
  let factory: ReturnType<typeof createMockFactory>;
  let ctx: ScriptContext;

  beforeEach(() => {
    manager = new MechanicManager();
    factory = createMockFactory();
    ctx = createMockCtx();
  });

  it('spawn creates a mechanic via the factory and adds to manager', () => {
    const runner = new ScriptRunnerImpl(manager, factory, ctx);
    const id = runner.spawn({ type: 'radialKnockback', x: 10, z: 15 });

    expect(id).toBe(1);
    expect(factory.created).toHaveLength(1);
    expect(factory.created[0]).toEqual({ type: 'radialKnockback', x: 10, z: 15 });
    expect(manager.getStates()).toHaveLength(1);
  });

  it('spawn returns incrementing IDs', () => {
    const runner = new ScriptRunnerImpl(manager, factory, ctx);
    const id1 = runner.spawn({ type: 'radialKnockback', x: 0, z: 0 });
    const id2 = runner.spawn({ type: 'radialKnockback', x: 5, z: 5 });

    expect(id2).toBeGreaterThan(id1);
  });

  it('wait delays execution', async () => {
    const runner = new ScriptRunnerImpl(manager, factory, ctx);
    const start = Date.now();
    await runner.wait(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40); // Allow some timing slack
  });

  it('at + runTimeline executes handlers in time order', async () => {
    const runner = new ScriptRunnerImpl(manager, factory, ctx);
    const order: number[] = [];

    runner.at(30, () => { order.push(2); });
    runner.at(10, () => { order.push(1); });
    runner.at(50, () => { order.push(3); });

    await runner.runTimeline({ duration: 100 });

    expect(order).toEqual([1, 2, 3]);
  });

  it('runTimeline supports dynamic scheduling (at() inside handlers)', async () => {
    const runner = new ScriptRunnerImpl(manager, factory, ctx);
    const order: number[] = [];

    runner.at(10, () => {
      order.push(1);
      runner.at(30, () => { order.push(2); });
    });

    await runner.runTimeline({ duration: 100 });

    expect(order).toEqual([1, 2]);
  });

  it('runTimeline completes within expected duration', async () => {
    const runner = new ScriptRunnerImpl(manager, factory, ctx);
    runner.at(10, () => {});

    const start = Date.now();
    await runner.runTimeline({ duration: 50 });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(40);
    expect(elapsed).toBeLessThan(200);
  });

  it('run creates isolated sub-script timeline', async () => {
    const runner = new ScriptRunnerImpl(manager, factory, ctx);
    const order: string[] = [];

    await runner.run(async (subRunner) => {
      subRunner.at(10, () => { order.push('sub'); });
      await subRunner.runTimeline({ duration: 50 });
    });

    order.push('parent');
    expect(order).toEqual(['sub', 'parent']);
  });

  it('waitForResolve resolves when mechanic completes', async () => {
    const mechanic = createMockMechanic({
      isExpired: vi.fn().mockReturnValue(true),
    });
    factory.create = () => mechanic;

    const runner = new ScriptRunnerImpl(manager, factory, ctx);
    const id = runner.spawn({ type: 'radialKnockback', x: 0, z: 0 });

    const resultPromise = runner.waitForResolve(id);

    // Tick the manager to resolve the mechanic
    manager.tick(Date.now(), []);

    const result = await resultPromise;
    expect(result.id).toBe(id);
    expect(result.type).toBe('mock');
  });
});

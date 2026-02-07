import { describe, it, expect } from 'vitest';
import { Player } from '../player.js';
import { PlayerInput, ARENA_SIZE, PLAYER_SPEED, JUMP_VELOCITY, GRAVITY } from '../../shared/types.js';

function makeInput(overrides: Partial<PlayerInput> = {}): PlayerInput {
  return {
    seq: 1,
    dt: 1 / 60,
    dx: 0,
    dz: 0,
    jump: false,
    cameraYaw: 0,
    ...overrides,
  };
}

describe('Player', () => {
  it('spawns at arena center', () => {
    const player = new Player('p1', 0x4a90d9);
    expect(player.position).toEqual({ x: ARENA_SIZE / 2, y: 0, z: ARENA_SIZE / 2 });
    expect(player.isGrounded).toBe(true);
    expect(player.lastProcessedInput).toBe(0);
  });

  it('processes input and updates position', () => {
    const player = new Player('p1', 0x4a90d9);
    const dt = 1 / 60;
    player.queueInput(makeInput({ dz: 1, dt }));
    player.processInputs(Date.now());
    expect(player.position.z).toBeCloseTo(ARENA_SIZE / 2 - PLAYER_SPEED * dt);
    expect(player.position.x).toBeCloseTo(ARENA_SIZE / 2);
  });

  it('processes sequential inputs in order', () => {
    const player = new Player('p1', 0x4a90d9);
    const dt = 1 / 60;
    player.queueInput(makeInput({ seq: 1, dz: 1, dt }));
    player.queueInput(makeInput({ seq: 2, dz: 1, dt }));
    player.queueInput(makeInput({ seq: 3, dz: 1, dt }));
    player.processInputs(Date.now());

    expect(player.position.z).toBeCloseTo(ARENA_SIZE / 2 - PLAYER_SPEED * dt * 3);
    expect(player.lastProcessedInput).toBe(3);
  });

  it('advances lastProcessedInput to the latest seq', () => {
    const player = new Player('p1', 0x4a90d9);
    player.queueInput(makeInput({ seq: 5 }));
    player.processInputs(Date.now());
    expect(player.lastProcessedInput).toBe(5);

    player.queueInput(makeInput({ seq: 10 }));
    player.processInputs(Date.now());
    expect(player.lastProcessedInput).toBe(10);
  });

  it('clears input queue after processing', () => {
    const player = new Player('p1', 0x4a90d9);
    player.queueInput(makeInput({ seq: 1, dz: 1 }));
    player.processInputs(Date.now());
    const posAfterFirst = { ...player.position };

    // Processing again with empty queue should not move
    player.processInputs(Date.now());
    expect(player.position).toEqual(posAfterFirst);
  });

  it('transitions grounded → airborne → grounded on jump', () => {
    const player = new Player('p1', 0x4a90d9);
    expect(player.isGrounded).toBe(true);

    // Jump
    player.queueInput(makeInput({ seq: 1, jump: true }));
    player.processInputs(Date.now());
    expect(player.isGrounded).toBe(false);
    expect(player.position.y).toBeGreaterThan(0);

    // Apply gravity until landing
    for (let i = 2; i < 200; i++) {
      player.queueInput(makeInput({ seq: i, dt: 1 / 60 }));
    }
    player.processInputs(Date.now());
    expect(player.isGrounded).toBe(true);
    expect(player.position.y).toBe(0);
  });

  it('prevents double-jump while airborne', () => {
    const player = new Player('p1', 0x4a90d9);

    // Jump
    player.queueInput(makeInput({ seq: 1, jump: true }));
    player.processInputs(Date.now());
    const velAfterJump = player.velocity.y;

    // Try to jump again while airborne
    player.queueInput(makeInput({ seq: 2, jump: true }));
    player.processInputs(Date.now());

    // Should NOT have re-jumped — velocity should be lower due to gravity
    expect(player.velocity.y).toBeLessThan(velAfterJump);
  });

  it('serializes toState() with all required fields', () => {
    const player = new Player('p1', 0x4a90d9);
    player.queueInput(makeInput({ seq: 7, dz: 1 }));
    player.processInputs(Date.now());

    const state = player.toState();
    expect(state).toEqual({
      id: 'p1',
      position: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number), z: expect.any(Number) }),
      velocity: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number), z: expect.any(Number) }),
      isGrounded: true,
      jumpHorizontalVelocity: { x: 0, y: 0, z: 0 },
      rotation: expect.any(Number),
      targetRotation: expect.any(Number),
      lastProcessedInput: 7,
      color: 0x4a90d9,
    });
  });

  it('toState() returns a copy, not a reference', () => {
    const player = new Player('p1', 0x4a90d9);
    const state = player.toState();
    state.position.x = 999;
    expect(player.position.x).toBe(ARENA_SIZE / 2);
  });

  it('clamps position to arena bounds', () => {
    const player = new Player('p1', 0x4a90d9);
    // Move far past the edge
    player.queueInput(makeInput({ seq: 1, dx: -1, dt: 100 }));
    player.processInputs(Date.now());
    expect(player.position.x).toBe(0);
  });

  // --- Knockback ---

  it('applyKnockback sets knockback state with clamped endpoint', () => {
    const player = new Player('p1', 0x4a90d9);
    player.applyKnockback(1, 0, 8, 500, 1000);
    expect(player.knockback).not.toBeNull();
    expect(player.knockback!.startX).toBe(ARENA_SIZE / 2);
    expect(player.knockback!.startZ).toBe(ARENA_SIZE / 2);
    expect(player.knockback!.endX).toBeCloseTo(ARENA_SIZE / 2 + 8);
    expect(player.knockback!.duration).toBe(500);
    expect(player.knockback!.startTime).toBe(1000);
  });

  it('applyKnockback clamps endpoint to arena bounds', () => {
    const player = new Player('p1', 0x4a90d9);
    player.position.x = 38;
    player.applyKnockback(1, 0, 8, 500, 1000);
    expect(player.knockback!.endX).toBe(ARENA_SIZE);
  });

  it('applyKnockback is ignored when knockback already active', () => {
    const player = new Player('p1', 0x4a90d9);
    player.applyKnockback(1, 0, 8, 500, 1000);
    const firstKB = { ...player.knockback! };

    player.applyKnockback(-1, 0, 12, 800, 1200);
    expect(player.knockback).toEqual(firstKB);
  });

  it('processInputs skips movement during knockback but updates lastProcessedInput', () => {
    const player = new Player('p1', 0x4a90d9);
    const startX = player.position.x;
    player.applyKnockback(1, 0, 8, 500, 1000);

    player.queueInput(makeInput({ seq: 5, dx: -1, dt: 1 / 60 }));
    // Process at a time during the knockback
    player.processInputs(1100);

    // lastProcessedInput should be updated
    expect(player.lastProcessedInput).toBe(5);
    // Position should be knockback-driven, not input-driven
    // At t=1100, elapsed=100ms, t_norm=100/500=0.2
    expect(player.position.x).not.toBe(startX);
  });

  it('knockback ends and player resumes normal movement', () => {
    const player = new Player('p1', 0x4a90d9);
    player.applyKnockback(1, 0, 8, 500, 1000);

    // Process after knockback duration ends
    player.processInputs(1600);
    expect(player.knockback).toBeNull();

    // Now movement should work again
    player.queueInput(makeInput({ seq: 1, dx: -1, dt: 1 }));
    player.processInputs(1700);
    expect(player.position.x).toBeLessThan(ARENA_SIZE / 2 + 8);
  });

  it('toState includes knockback when active', () => {
    const player = new Player('p1', 0x4a90d9);
    player.applyKnockback(1, 0, 8, 500, 1000);
    const state = player.toState();
    expect(state.knockback).toBeDefined();
    expect(state.knockback!.startTime).toBe(1000);
    expect(state.knockback!.duration).toBe(500);
  });

  it('toState omits knockback when not active', () => {
    const player = new Player('p1', 0x4a90d9);
    const state = player.toState();
    expect(state.knockback).toBeUndefined();
  });
});

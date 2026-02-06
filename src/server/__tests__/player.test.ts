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
    player.processInputs();
    expect(player.position.z).toBeCloseTo(ARENA_SIZE / 2 - PLAYER_SPEED * dt);
    expect(player.position.x).toBeCloseTo(ARENA_SIZE / 2);
  });

  it('processes sequential inputs in order', () => {
    const player = new Player('p1', 0x4a90d9);
    const dt = 1 / 60;
    player.queueInput(makeInput({ seq: 1, dz: 1, dt }));
    player.queueInput(makeInput({ seq: 2, dz: 1, dt }));
    player.queueInput(makeInput({ seq: 3, dz: 1, dt }));
    player.processInputs();

    expect(player.position.z).toBeCloseTo(ARENA_SIZE / 2 - PLAYER_SPEED * dt * 3);
    expect(player.lastProcessedInput).toBe(3);
  });

  it('advances lastProcessedInput to the latest seq', () => {
    const player = new Player('p1', 0x4a90d9);
    player.queueInput(makeInput({ seq: 5 }));
    player.processInputs();
    expect(player.lastProcessedInput).toBe(5);

    player.queueInput(makeInput({ seq: 10 }));
    player.processInputs();
    expect(player.lastProcessedInput).toBe(10);
  });

  it('clears input queue after processing', () => {
    const player = new Player('p1', 0x4a90d9);
    player.queueInput(makeInput({ seq: 1, dz: 1 }));
    player.processInputs();
    const posAfterFirst = { ...player.position };

    // Processing again with empty queue should not move
    player.processInputs();
    expect(player.position).toEqual(posAfterFirst);
  });

  it('transitions grounded → airborne → grounded on jump', () => {
    const player = new Player('p1', 0x4a90d9);
    expect(player.isGrounded).toBe(true);

    // Jump
    player.queueInput(makeInput({ seq: 1, jump: true }));
    player.processInputs();
    expect(player.isGrounded).toBe(false);
    expect(player.position.y).toBeGreaterThan(0);

    // Apply gravity until landing
    for (let i = 2; i < 200; i++) {
      player.queueInput(makeInput({ seq: i, dt: 1 / 60 }));
    }
    player.processInputs();
    expect(player.isGrounded).toBe(true);
    expect(player.position.y).toBe(0);
  });

  it('prevents double-jump while airborne', () => {
    const player = new Player('p1', 0x4a90d9);

    // Jump
    player.queueInput(makeInput({ seq: 1, jump: true }));
    player.processInputs();
    const velAfterJump = player.velocity.y;

    // Try to jump again while airborne
    player.queueInput(makeInput({ seq: 2, jump: true }));
    player.processInputs();

    // Should NOT have re-jumped — velocity should be lower due to gravity
    expect(player.velocity.y).toBeLessThan(velAfterJump);
  });

  it('serializes toState() with all required fields', () => {
    const player = new Player('p1', 0x4a90d9);
    player.queueInput(makeInput({ seq: 7, dz: 1 }));
    player.processInputs();

    const state = player.toState();
    expect(state).toEqual({
      id: 'p1',
      position: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number), z: expect.any(Number) }),
      velocity: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number), z: expect.any(Number) }),
      isGrounded: true,
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
    player.processInputs();
    expect(player.position.x).toBe(0);
  });
});

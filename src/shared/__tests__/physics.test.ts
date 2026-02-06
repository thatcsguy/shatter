import { describe, it, expect } from 'vitest';
import { applyPhysics, PhysicsState } from '../physics.js';
import { PlayerInput, ARENA_SIZE, PLAYER_SPEED, JUMP_VELOCITY, GRAVITY } from '../types.js';

function makeState(overrides: Partial<PhysicsState> = {}): PhysicsState {
  return {
    position: { x: 20, y: 0, z: 20 },
    velocity: { x: 0, y: 0, z: 0 },
    isGrounded: true,
    ...overrides,
  };
}

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

describe('applyPhysics', () => {
  it('does not move with zero input', () => {
    const state = makeState();
    const result = applyPhysics(state, makeInput());
    expect(result.position.x).toBeCloseTo(20);
    expect(result.position.z).toBeCloseTo(20);
    expect(result.position.y).toBe(0);
  });

  it('moves forward (negative Z, away from camera) with dz=1 and cameraYaw=0', () => {
    const state = makeState();
    const dt = 1 / 60;
    const result = applyPhysics(state, makeInput({ dz: 1, dt }));
    expect(result.position.z).toBeCloseTo(20 - PLAYER_SPEED * dt);
    expect(result.position.x).toBeCloseTo(20);
  });

  it('moves backward (positive Z, toward camera) with dz=-1', () => {
    const state = makeState();
    const dt = 1 / 60;
    const result = applyPhysics(state, makeInput({ dz: -1, dt }));
    expect(result.position.z).toBeCloseTo(20 + PLAYER_SPEED * dt);
  });

  it('moves right with dx=1 and cameraYaw=0', () => {
    const state = makeState();
    const dt = 1 / 60;
    const result = applyPhysics(state, makeInput({ dx: 1, dt }));
    expect(result.position.x).toBeCloseTo(20 + PLAYER_SPEED * dt);
  });

  it('normalizes diagonal movement', () => {
    const state = makeState();
    const dt = 1 / 60;
    const diag = applyPhysics(state, makeInput({ dx: 1, dz: 1, dt }));
    const straight = applyPhysics(state, makeInput({ dx: 1, dz: 0, dt }));

    // Diagonal distance should equal straight distance
    const diagDist = Math.sqrt(
      (diag.position.x - 20) ** 2 + (diag.position.z - 20) ** 2
    );
    const straightDist = Math.abs(straight.position.x - 20);
    expect(diagDist).toBeCloseTo(straightDist, 5);
  });

  it('applies camera-relative movement', () => {
    const state = makeState();
    const dt = 1 / 60;
    // Camera rotated 90 degrees: forward (dz=1) should now move in -X
    const result = applyPhysics(state, makeInput({ dz: 1, dt, cameraYaw: Math.PI / 2 }));
    expect(result.position.x).toBeCloseTo(20 - PLAYER_SPEED * dt, 4);
    expect(result.position.z).toBeCloseTo(20, 4);
  });

  it('clamps to arena bounds on all 4 edges', () => {
    // Left edge
    const left = applyPhysics(
      makeState({ position: { x: 0, y: 0, z: 20 } }),
      makeInput({ dx: -1, dt: 1 })
    );
    expect(left.position.x).toBe(0);

    // Right edge
    const right = applyPhysics(
      makeState({ position: { x: ARENA_SIZE, y: 0, z: 20 } }),
      makeInput({ dx: 1, dt: 1 })
    );
    expect(right.position.x).toBe(ARENA_SIZE);

    // Bottom edge (forward moves in -Z)
    const bottom = applyPhysics(
      makeState({ position: { x: 20, y: 0, z: 0 } }),
      makeInput({ dz: 1, dt: 1 })
    );
    expect(bottom.position.z).toBe(0);

    // Top edge (backward moves in +Z)
    const top = applyPhysics(
      makeState({ position: { x: 20, y: 0, z: ARENA_SIZE } }),
      makeInput({ dz: -1, dt: 1 })
    );
    expect(top.position.z).toBe(ARENA_SIZE);
  });

  it('initiates jump from ground', () => {
    const state = makeState();
    const result = applyPhysics(state, makeInput({ jump: true }));
    expect(result.velocity.y).toBeCloseTo(JUMP_VELOCITY + GRAVITY * (1 / 60));
    expect(result.isGrounded).toBe(false);
    expect(result.position.y).toBeGreaterThan(0);
  });

  it('does not double-jump when airborne', () => {
    const airborne = makeState({
      position: { x: 20, y: 5, z: 20 },
      velocity: { x: 0, y: 2, z: 0 },
      isGrounded: false,
    });
    const result = applyPhysics(airborne, makeInput({ jump: true }));
    // Velocity should decrease due to gravity, not reset to JUMP_VELOCITY
    expect(result.velocity.y).toBeCloseTo(2 + GRAVITY * (1 / 60));
  });

  it('applies gravity when airborne', () => {
    const airborne = makeState({
      position: { x: 20, y: 10, z: 20 },
      velocity: { x: 0, y: 0, z: 0 },
      isGrounded: false,
    });
    const dt = 1 / 60;
    const result = applyPhysics(airborne, makeInput({ dt }));
    expect(result.velocity.y).toBeCloseTo(GRAVITY * dt);
    expect(result.position.y).toBeLessThan(10);
  });

  it('lands at y=0', () => {
    const falling = makeState({
      position: { x: 20, y: 0.01, z: 20 },
      velocity: { x: 0, y: -5, z: 0 },
      isGrounded: false,
    });
    const result = applyPhysics(falling, makeInput({ dt: 1 / 60 }));
    expect(result.position.y).toBe(0);
    expect(result.velocity.y).toBe(0);
    expect(result.isGrounded).toBe(true);
  });

  it('scales movement with delta time', () => {
    const state = makeState();
    const fast = applyPhysics(state, makeInput({ dz: 1, dt: 1 / 30 }));
    const slow = applyPhysics(state, makeInput({ dz: 1, dt: 1 / 60 }));
    const fastDist = 20 - fast.position.z;
    const slowDist = 20 - slow.position.z;
    expect(fastDist).toBeCloseTo(slowDist * 2, 5);
  });
});

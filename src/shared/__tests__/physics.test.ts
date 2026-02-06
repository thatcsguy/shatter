import { describe, it, expect } from 'vitest';
import { applyPhysics, PhysicsState } from '../physics.js';
import { PlayerInput, ARENA_SIZE, PLAYER_SPEED, JUMP_VELOCITY, GRAVITY } from '../types.js';

function makeState(overrides: Partial<PhysicsState> = {}): PhysicsState {
  return {
    position: { x: 20, y: 0, z: 20 },
    velocity: { x: 0, y: 0, z: 0 },
    isGrounded: true,
    jumpHorizontalVelocity: { x: 0, y: 0, z: 0 },
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

  it('snapshots horizontal velocity at jump start', () => {
    const state = makeState();
    const dt = 1 / 60;
    // Jump while moving forward
    const result = applyPhysics(state, makeInput({ dz: 1, jump: true, dt }));
    expect(result.jumpHorizontalVelocity.z).toBeCloseTo(-PLAYER_SPEED);
    expect(result.isGrounded).toBe(false);
  });

  it('preserves horizontal momentum mid-air from snapshot', () => {
    const state = makeState();
    const dt = 1 / 60;
    // Jump while moving forward
    const jumped = applyPhysics(state, makeInput({ dz: 1, jump: true, dt }));
    const zAfterJump = jumped.position.z;

    // Next frame: no input, but should still move forward from snapshot
    const airborne = applyPhysics(jumped, makeInput({ dt }));
    expect(airborne.position.z).toBeCloseTo(zAfterJump - PLAYER_SPEED * dt);
  });

  it('ignores new directional input while airborne', () => {
    const state = makeState();
    const dt = 1 / 60;
    // Jump while moving forward
    const jumped = applyPhysics(state, makeInput({ dz: 1, jump: true, dt }));

    // Try to move right mid-air — should be ignored
    const airborne = applyPhysics(jumped, makeInput({ dx: 1, dz: 0, dt }));
    // Should still move in original jump direction (forward = -Z), not right (+X)
    expect(airborne.velocity.z).toBeCloseTo(-PLAYER_SPEED);
    expect(airborne.velocity.x).toBeCloseTo(0);
  });

  it('clears jump horizontal velocity on landing', () => {
    const falling = makeState({
      position: { x: 20, y: 0.01, z: 20 },
      velocity: { x: 0, y: -5, z: 0 },
      isGrounded: false,
      jumpHorizontalVelocity: { x: PLAYER_SPEED, y: 0, z: 0 },
    });
    const result = applyPhysics(falling, makeInput({ dt: 1 / 60 }));
    expect(result.isGrounded).toBe(true);
    expect(result.jumpHorizontalVelocity).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('standing jump with no input has zero horizontal velocity', () => {
    const state = makeState();
    const dt = 1 / 60;
    // Jump with no directional input
    const jumped = applyPhysics(state, makeInput({ jump: true, dt }));
    expect(jumped.jumpHorizontalVelocity.x).toBeCloseTo(0);
    expect(jumped.jumpHorizontalVelocity.z).toBeCloseTo(0);

    // Should not move horizontally while airborne
    const airborne = applyPhysics(jumped, makeInput({ dt }));
    expect(airborne.position.x).toBeCloseTo(20);
    expect(airborne.position.z).toBeCloseTo(20);
  });

  it('scales movement with delta time', () => {
    const state = makeState();
    const fast = applyPhysics(state, makeInput({ dz: 1, dt: 1 / 30 }));
    const slow = applyPhysics(state, makeInput({ dz: 1, dt: 1 / 60 }));
    const fastDist = 20 - fast.position.z;
    const slowDist = 20 - slow.position.z;
    expect(fastDist).toBeCloseTo(slowDist * 2, 5);
  });

  it('round-trips jumpHorizontalVelocity through simulate-reconcile-replay', () => {
    const dt = 1 / 60;
    const inputs = [
      makeInput({ seq: 1, dz: 1, jump: true, dt }),
      makeInput({ seq: 2, dz: 1, dt }),
      makeInput({ seq: 3, dz: 0, dt }),
    ];

    // Continuous simulation (client prediction)
    let continuous = makeState();
    for (const input of inputs) {
      continuous = applyPhysics(continuous, input);
    }

    // Simulate server acking seq 1: take state after input 1 as "server state"
    const serverState = applyPhysics(makeState(), inputs[0]);

    // Reconcile: reset to server state, replay inputs 2 and 3
    let reconciled: PhysicsState = {
      position: { ...serverState.position },
      velocity: { ...serverState.velocity },
      isGrounded: serverState.isGrounded,
      jumpHorizontalVelocity: { ...serverState.jumpHorizontalVelocity },
    };
    for (const input of inputs.slice(1)) {
      reconciled = applyPhysics(reconciled, input);
    }

    // Should match continuous simulation exactly
    expect(reconciled.position.x).toBeCloseTo(continuous.position.x);
    expect(reconciled.position.y).toBeCloseTo(continuous.position.y);
    expect(reconciled.position.z).toBeCloseTo(continuous.position.z);
    expect(reconciled.jumpHorizontalVelocity).toEqual(continuous.jumpHorizontalVelocity);
  });

  it('replaying after mid-jump server reset matches continuous simulation', () => {
    const dt = 1 / 60;
    const inputs = [
      makeInput({ seq: 1, dz: 1, jump: true, dt }),
      makeInput({ seq: 2, dt }),
      makeInput({ seq: 3, dt }),
      makeInput({ seq: 4, dx: 1, dt }),
      makeInput({ seq: 5, dt }),
    ];

    // Continuous simulation
    let continuous = makeState();
    for (const input of inputs) {
      continuous = applyPhysics(continuous, input);
    }

    // Server acks through seq 3: take state after inputs 1-3 as server state
    let serverState = makeState();
    for (const input of inputs.slice(0, 3)) {
      serverState = applyPhysics(serverState, input);
    }

    // Reconcile: reset to server state, replay inputs 4 and 5
    let reconciled: PhysicsState = {
      position: { ...serverState.position },
      velocity: { ...serverState.velocity },
      isGrounded: serverState.isGrounded,
      jumpHorizontalVelocity: { ...serverState.jumpHorizontalVelocity },
    };
    for (const input of inputs.slice(3)) {
      reconciled = applyPhysics(reconciled, input);
    }

    expect(reconciled.position.x).toBeCloseTo(continuous.position.x);
    expect(reconciled.position.y).toBeCloseTo(continuous.position.y);
    expect(reconciled.position.z).toBeCloseTo(continuous.position.z);
  });
});

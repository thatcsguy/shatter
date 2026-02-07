import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PlayerInput,
  PlayerState,
  GameState,
  ARENA_SIZE,
  PLAYER_SPEED,
  JUMP_VELOCITY,
  GRAVITY,
  INTERPOLATION_BUFFER_SIZE,
} from '../../shared/types.js';

// --- Socket.IO mock ---
const handlers: Record<string, (...args: any[]) => void> = {};
const mockSocket = {
  on: vi.fn((event: string, cb: (...args: any[]) => void) => {
    handlers[event] = cb;
  }),
  emit: vi.fn(),
  connect: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: () => mockSocket,
}));

import { NetworkManager, lerpAngle } from '../network.js';
import { applyPhysics } from '../../shared/physics.js';

// --- Helpers ---

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

function makePlayerState(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id: 'local',
    position: { x: ARENA_SIZE / 2, y: 0, z: ARENA_SIZE / 2 },
    velocity: { x: 0, y: 0, z: 0 },
    isGrounded: true,
    jumpHorizontalVelocity: { x: 0, y: 0, z: 0 },
    rotation: 0,
    targetRotation: 0,
    lastProcessedInput: 0,
    color: 0x4a90d9,
    ...overrides,
  };
}

function makeGameState(players: Record<string, PlayerState>, timestamp = 1000): GameState {
  return { players, mechanics: [], timestamp };
}

function joinGame(nm: NetworkManager, id = 'local'): void {
  const me = makePlayerState({ id });
  handlers['game:joined']({ id, state: makeGameState({ [id]: me }) });
}

describe('NetworkManager', () => {
  let nm: NetworkManager;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(handlers).forEach((k) => delete handlers[k]);
    nm = new NetworkManager();
  });

  // --- Prediction ---

  describe('prediction', () => {
    it('updates local position when input is sent', () => {
      joinGame(nm);
      const before = { ...nm.localState!.position };

      nm.sendInput(makeInput({ dz: 1, dt: 1 / 60 }));

      expect(nm.localState!.position.z).toBeCloseTo(before.z - PLAYER_SPEED * (1 / 60));
    });

    it('accumulates multiple predicted inputs', () => {
      joinGame(nm);
      const startZ = nm.localState!.position.z;
      const dt = 1 / 60;

      nm.sendInput(makeInput({ seq: 1, dz: 1, dt }));
      nm.sendInput(makeInput({ seq: 2, dz: 1, dt }));
      nm.sendInput(makeInput({ seq: 3, dz: 1, dt }));

      expect(nm.localState!.position.z).toBeCloseTo(startZ - PLAYER_SPEED * dt * 3);
      expect(nm.pendingCount).toBe(3);
    });

    it('emits input to server', () => {
      joinGame(nm);
      const input = makeInput({ seq: 5, dz: 1 });
      nm.sendInput(input);
      expect(mockSocket.emit).toHaveBeenCalledWith('game:input', input);
    });

    it('does nothing before joining', () => {
      nm.sendInput(makeInput({ dz: 1 }));
      expect(nm.localState).toBeNull();
      expect(mockSocket.emit).not.toHaveBeenCalledWith('game:input', expect.anything());
    });
  });

  // --- Reconciliation ---

  describe('reconciliation', () => {
    it('removes acknowledged inputs from pending queue', () => {
      joinGame(nm);
      nm.sendInput(makeInput({ seq: 1, dz: 1 }));
      nm.sendInput(makeInput({ seq: 2, dz: 1 }));
      nm.sendInput(makeInput({ seq: 3, dz: 1 }));
      expect(nm.pendingCount).toBe(3);

      // Server acknowledges up to seq 2
      const serverState = makePlayerState({ id: 'local', lastProcessedInput: 2 });
      handlers['game:state'](makeGameState({ local: serverState }));

      expect(nm.pendingCount).toBe(1); // only seq 3 remains
    });

    it('replays unacknowledged inputs after server reset', () => {
      joinGame(nm);
      const dt = 1 / 60;

      nm.sendInput(makeInput({ seq: 1, dz: 1, dt }));
      nm.sendInput(makeInput({ seq: 2, dz: 1, dt }));
      nm.sendInput(makeInput({ seq: 3, dz: 1, dt }));

      // Server acknowledges seq 1, with its authoritative position
      const serverPos = { x: ARENA_SIZE / 2, y: 0, z: ARENA_SIZE / 2 - PLAYER_SPEED * dt };
      const serverState = makePlayerState({
        id: 'local',
        position: serverPos,
        lastProcessedInput: 1,
      });
      handlers['game:state'](makeGameState({ local: serverState }));

      // Local state = server position + replay of seq 2 and seq 3
      expect(nm.localState!.position.z).toBeCloseTo(
        serverPos.z - PLAYER_SPEED * dt * 2
      );
    });

    it('resets to server state when all inputs are acknowledged', () => {
      joinGame(nm);
      nm.sendInput(makeInput({ seq: 1, dz: 1, dt: 1 / 60 }));

      const serverPos = { x: 10, y: 0, z: 10 };
      const serverState = makePlayerState({
        id: 'local',
        position: serverPos,
        lastProcessedInput: 1,
      });
      handlers['game:state'](makeGameState({ local: serverState }));

      expect(nm.pendingCount).toBe(0);
      expect(nm.localState!.position).toEqual(serverPos);
    });

    it('preserves horizontal momentum during jump reconciliation', () => {
      joinGame(nm);
      const dt = 1 / 60;

      // Jump while moving forward
      nm.sendInput(makeInput({ seq: 1, dz: 1, jump: true, dt }));
      // Continue airborne
      nm.sendInput(makeInput({ seq: 2, dt }));
      nm.sendInput(makeInput({ seq: 3, dt }));

      // Server acks seq 1 with correct mid-jump state
      const jumpVelZ = -PLAYER_SPEED;
      const velY = JUMP_VELOCITY + GRAVITY * dt;
      const serverState = makePlayerState({
        id: 'local',
        position: {
          x: ARENA_SIZE / 2,
          y: JUMP_VELOCITY * dt + GRAVITY * dt * dt,
          z: ARENA_SIZE / 2 + jumpVelZ * dt,
        },
        velocity: { x: 0, y: velY, z: jumpVelZ },
        isGrounded: false,
        jumpHorizontalVelocity: { x: 0, y: 0, z: jumpVelZ },
        lastProcessedInput: 1,
      });
      handlers['game:state'](makeGameState({ local: serverState }));

      // After reconciliation, player should still be moving forward (negative Z)
      expect(nm.localState!.jumpHorizontalVelocity.z).toBeCloseTo(jumpVelZ);
      expect(nm.localState!.isGrounded).toBe(false);
      // Position should have continued forward from server state
      expect(nm.localState!.position.z).toBeLessThan(serverState.position.z);
    });

    it('matches pure prediction after reconciliation + replay during jump', () => {
      joinGame(nm);
      const dt = 1 / 60;

      // Record position before any inputs
      const startPos = { ...nm.localState!.position };

      // Send inputs: jump while moving, then continue airborne
      nm.sendInput(makeInput({ seq: 1, dz: 1, jump: true, dt }));
      nm.sendInput(makeInput({ seq: 2, dt }));
      nm.sendInput(makeInput({ seq: 3, dt }));

      // Save predicted state before reconciliation
      const predictedPos = { ...nm.localState!.position };

      // Simulate identical server physics for seq 1
      const serverPhysics = applyPhysics(
        {
          position: { ...startPos },
          velocity: { x: 0, y: 0, z: 0 },
          isGrounded: true,
          jumpHorizontalVelocity: { x: 0, y: 0, z: 0 },
          rotation: 0,
          targetRotation: 0,
        },
        makeInput({ seq: 1, dz: 1, jump: true, dt }),
      );

      const serverState = makePlayerState({
        id: 'local',
        position: { ...serverPhysics.position },
        velocity: { ...serverPhysics.velocity },
        isGrounded: serverPhysics.isGrounded,
        jumpHorizontalVelocity: { ...serverPhysics.jumpHorizontalVelocity },
        lastProcessedInput: 1,
      });
      handlers['game:state'](makeGameState({ local: serverState }));

      // After reconciliation + replay, position should match original prediction
      expect(nm.localState!.position.x).toBeCloseTo(predictedPos.x);
      expect(nm.localState!.position.y).toBeCloseTo(predictedPos.y);
      expect(nm.localState!.position.z).toBeCloseTo(predictedPos.z);
    });
  });

  // --- Interpolation ---

  describe('interpolation', () => {
    it('returns null for unknown player', () => {
      expect(nm.getInterpolatedState('unknown')).toBeNull();
    });

    it('returns null for player with empty buffer', () => {
      joinGame(nm);
      expect(nm.getInterpolatedState('other')).toBeNull();
    });

    it('returns latest state when only one snapshot exists', () => {
      joinGame(nm);
      const otherState = makePlayerState({
        id: 'other',
        position: { x: 5, y: 0, z: 5 },
      });
      handlers['game:state'](
        makeGameState({ local: makePlayerState({ id: 'local' }), other: otherState }, 1000)
      );

      // With only one snapshot, should return it regardless of render time
      const result = nm.getInterpolatedState('other');
      expect(result).not.toBeNull();
      expect(result!.position).toEqual({ x: 5, y: 0, z: 5 });
    });

    it('interpolates between two snapshots', () => {
      joinGame(nm);

      const local = makePlayerState({ id: 'local' });
      const otherA = makePlayerState({ id: 'other', position: { x: 0, y: 0, z: 0 } });
      const otherB = makePlayerState({ id: 'other', position: { x: 10, y: 0, z: 10 } });

      // Push two snapshots at known timestamps
      const tA = 1000;
      const tB = 1050;
      handlers['game:state'](makeGameState({ local, other: otherA }, tA));
      handlers['game:state'](makeGameState({ local, other: otherB }, tB));

      // Mock Date.now so renderTime falls at midpoint between tA and tB
      // renderTime = Date.now() - 100ms, so Date.now() = renderTime + 100
      // We want renderTime = (tA + tB) / 2 = 1025
      vi.spyOn(Date, 'now').mockReturnValue(1025 + 100);

      const result = nm.getInterpolatedState('other');
      expect(result).not.toBeNull();
      expect(result!.position.x).toBeCloseTo(5);
      expect(result!.position.z).toBeCloseTo(5);

      vi.restoreAllMocks();
    });

    it('clamps interpolation factor to [0, 1]', () => {
      joinGame(nm);

      const local = makePlayerState({ id: 'local' });
      const otherA = makePlayerState({ id: 'other', position: { x: 0, y: 0, z: 0 } });
      const otherB = makePlayerState({ id: 'other', position: { x: 10, y: 0, z: 10 } });

      handlers['game:state'](makeGameState({ local, other: otherA }, 1000));
      handlers['game:state'](makeGameState({ local, other: otherB }, 1050));

      // renderTime well past tB — should clamp to tB's position
      vi.spyOn(Date, 'now').mockReturnValue(1200 + 100);

      const result = nm.getInterpolatedState('other');
      expect(result).not.toBeNull();
      // When renderTime > last snapshot, returns the last snapshot directly
      expect(result!.position.x).toBeCloseTo(10);
      expect(result!.position.z).toBeCloseTo(10);

      vi.restoreAllMocks();
    });

    it('returns earliest snapshot when render time is before buffer', () => {
      joinGame(nm);

      const local = makePlayerState({ id: 'local' });
      const otherA = makePlayerState({ id: 'other', position: { x: 2, y: 0, z: 2 } });
      const otherB = makePlayerState({ id: 'other', position: { x: 10, y: 0, z: 10 } });

      handlers['game:state'](makeGameState({ local, other: otherA }, 5000));
      handlers['game:state'](makeGameState({ local, other: otherB }, 5050));

      // renderTime before first snapshot — t factor < 0, clamped to 0
      vi.spyOn(Date, 'now').mockReturnValue(4900 + 100);

      const result = nm.getInterpolatedState('other');
      expect(result).not.toBeNull();
      expect(result!.position.x).toBeCloseTo(2);
      expect(result!.position.z).toBeCloseTo(2);

      vi.restoreAllMocks();
    });
  });

  // --- Buffer management ---

  describe('buffer management', () => {
    it('prunes old snapshots beyond buffer size', () => {
      joinGame(nm);

      const local = makePlayerState({ id: 'local' });
      for (let i = 0; i < INTERPOLATION_BUFFER_SIZE + 5; i++) {
        const other = makePlayerState({ id: 'other', position: { x: i, y: 0, z: i } });
        handlers['game:state'](makeGameState({ local, other }, 1000 + i * 50));
      }

      expect(nm.getBufferSize('other')).toBe(INTERPOLATION_BUFFER_SIZE);
    });

    it('removes buffer on player leave', () => {
      joinGame(nm);

      const local = makePlayerState({ id: 'local' });
      const other = makePlayerState({ id: 'other' });
      handlers['game:state'](makeGameState({ local, other }, 1000));
      expect(nm.getBufferSize('other')).toBe(1);

      handlers['game:playerLeft']('other');
      expect(nm.getBufferSize('other')).toBe(0);
    });
  });

  // --- Player count ---

  describe('player count', () => {
    it('updates on join', () => {
      joinGame(nm);
      expect(nm.playerCount).toBe(1);
    });

    it('updates on state broadcast', () => {
      joinGame(nm);
      const local = makePlayerState({ id: 'local' });
      const other = makePlayerState({ id: 'other' });
      handlers['game:state'](makeGameState({ local, other }, 1000));
      expect(nm.playerCount).toBe(2);
    });
  });

  // --- Rotation ---

  describe('rotation', () => {
    it('prediction includes rotation', () => {
      joinGame(nm);
      expect(nm.localState!.rotation).toBe(0);

      nm.sendInput(makeInput({ dx: 1, dt: 1 / 60 }));
      // Moving right → rotation should have stepped toward PI/2
      expect(nm.localState!.rotation).toBeGreaterThan(0);
      expect(nm.localState!.targetRotation).toBeCloseTo(Math.PI / 2);
    });

    it('reconciliation preserves rotation', () => {
      joinGame(nm);
      const dt = 1 / 60;

      nm.sendInput(makeInput({ seq: 1, dx: 1, dt }));
      nm.sendInput(makeInput({ seq: 2, dx: 1, dt }));

      const serverPhysics = applyPhysics(
        {
          position: { x: ARENA_SIZE / 2, y: 0, z: ARENA_SIZE / 2 },
          velocity: { x: 0, y: 0, z: 0 },
          isGrounded: true,
          jumpHorizontalVelocity: { x: 0, y: 0, z: 0 },
          rotation: 0,
          targetRotation: 0,
        },
        makeInput({ seq: 1, dx: 1, dt }),
      );

      const serverState = makePlayerState({
        id: 'local',
        position: { ...serverPhysics.position },
        velocity: { ...serverPhysics.velocity },
        rotation: serverPhysics.rotation,
        targetRotation: serverPhysics.targetRotation,
        lastProcessedInput: 1,
      });
      handlers['game:state'](makeGameState({ local: serverState }));

      // After reconciliation + replay of seq 2, rotation should match pure prediction
      expect(nm.localState!.rotation).toBeGreaterThan(serverPhysics.rotation);
      expect(nm.localState!.targetRotation).toBeCloseTo(Math.PI / 2);
    });

    it('angular interpolation works', () => {
      // lerpAngle should interpolate linearly
      expect(lerpAngle(0, Math.PI / 2, 0.5)).toBeCloseTo(Math.PI / 4);
      expect(lerpAngle(0, Math.PI / 2, 0)).toBeCloseTo(0);
      expect(lerpAngle(0, Math.PI / 2, 1)).toBeCloseTo(Math.PI / 2);
    });

    it('interpolation takes shortest arc across PI boundary', () => {
      // From just below PI to just above -PI → shortest path crosses PI
      const a = Math.PI - 0.1;
      const b = -(Math.PI - 0.1);
      const mid = lerpAngle(a, b, 0.5);
      // Shortest arc goes through PI, so midpoint should be near PI (or -PI)
      expect(Math.abs(mid)).toBeCloseTo(Math.PI, 1);
    });

    it('interpolates rotation for other players', () => {
      joinGame(nm);

      const local = makePlayerState({ id: 'local' });
      const otherA = makePlayerState({ id: 'other', position: { x: 5, y: 0, z: 5 }, rotation: 0 });
      const otherB = makePlayerState({ id: 'other', position: { x: 10, y: 0, z: 10 }, rotation: Math.PI / 2 });

      handlers['game:state'](makeGameState({ local, other: otherA }, 1000));
      handlers['game:state'](makeGameState({ local, other: otherB }, 1050));

      // renderTime at midpoint
      vi.spyOn(Date, 'now').mockReturnValue(1025 + 100);

      const result = nm.getInterpolatedState('other');
      expect(result).not.toBeNull();
      expect(result!.rotation).toBeCloseTo(Math.PI / 4);

      vi.restoreAllMocks();
    });
  });
});

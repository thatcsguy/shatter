import { io, Socket } from 'socket.io-client';
import {
  PlayerInput,
  GameState,
  PlayerState,
  MechanicStateData,
  Vec3,
  INTERPOLATION_BUFFER_SIZE,
  INTERPOLATION_DELAY_MS,
  ServerToClientEvents,
  ClientToServerEvents,
} from '../shared/types.js';
import { applyPhysics, applyVerticalPhysics, PhysicsState, normalizeAngle } from '../shared/physics.js';
import { KnockbackState, getKnockbackPosition } from '../shared/knockback.js';

interface Snapshot {
  timestamp: number;
  state: PlayerState;
}

export function lerpAngle(a: number, b: number, t: number): number {
  const diff = normalizeAngle(b - a);
  return normalizeAngle(a + diff * t);
}

export class NetworkManager {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  private pendingInputs: (PlayerInput & { predictedPosition: Vec3; predictedRotation: number })[] = [];
  private interpolationBuffers = new Map<string, Snapshot[]>();
  private latestState: GameState | null = null;
  private _localId: string | null = null;
  private _localState: PhysicsState | null = null;
  private _playerCount = 0;
  private _ping = 0;
  private _localKnockback: KnockbackState | null = null;
  private _mechanics: MechanicStateData[] = [];

  get localId(): string | null { return this._localId; }
  get localState(): PhysicsState | null { return this._localState; }
  get playerCount(): number { return this._playerCount; }
  get ping(): number { return this._ping; }
  get pendingCount(): number { return this.pendingInputs.length; }
  get localKnockback(): KnockbackState | null { return this._localKnockback; }
  get mechanics(): MechanicStateData[] { return this._mechanics; }

  constructor() {
    this.socket = io({ autoConnect: false });

    this.socket.on('game:joined', ({ id, state }) => {
      this._localId = id;
      const me = state.players[id];
      if (me) {
        this._localState = {
          position: { ...me.position },
          velocity: { ...me.velocity },
          isGrounded: me.isGrounded,
          jumpHorizontalVelocity: { ...me.jumpHorizontalVelocity },
          rotation: me.rotation,
          targetRotation: me.targetRotation,
        };
      }
      this._playerCount = Object.keys(state.players).length;
    });

    this.socket.on('game:state', (state) => {
      this.latestState = state;
      this._playerCount = Object.keys(state.players).length;
      this._mechanics = state.mechanics ?? [];

      // Reconcile local player
      if (this._localId && state.players[this._localId]) {
        this.reconcile(state.players[this._localId]);
      }

      // Buffer other players for interpolation
      for (const [id, playerState] of Object.entries(state.players)) {
        if (id === this._localId) continue;
        if (!this.interpolationBuffers.has(id)) {
          this.interpolationBuffers.set(id, []);
        }
        const buffer = this.interpolationBuffers.get(id)!;
        buffer.push({ timestamp: state.timestamp, state: playerState });
        if (buffer.length > INTERPOLATION_BUFFER_SIZE) {
          buffer.shift();
        }
      }
    });

    this.socket.on('game:playerLeft', (id) => {
      this.interpolationBuffers.delete(id);
    });

    this.socket.on('player:colorChanged', ({ id, color }) => {
      if (this.latestState && this.latestState.players[id]) {
        this.latestState.players[id].color = color;
      }
    });
  }

  connect(): void {
    this.socket.connect();
    this.socket.emit('game:join');
  }

  sendInput(input: PlayerInput): void {
    if (!this._localState) return;

    // During knockback, update XZ from knockback physics, but continue vertical physics
    if (this._localKnockback) {
      const kb = getKnockbackPosition(this._localKnockback, Date.now());
      this._localState.position.x = kb.x;
      this._localState.position.z = kb.z;
      if (!kb.active) {
        this._localKnockback = null;
        this._localState.velocity = { x: 0, y: this._localState.velocity.y, z: 0 };
      }
      // Apply vertical physics (gravity/landing) during knockback
      const vert = applyVerticalPhysics(
        this._localState.position,
        this._localState.velocity,
        this._localState.isGrounded,
        input.dt,
      );
      this._localState.position = vert.position;
      this._localState.velocity = vert.velocity;
      this._localState.isGrounded = vert.isGrounded;
      if (this._localState.isGrounded) {
        this._localState.jumpHorizontalVelocity = { x: 0, y: 0, z: 0 };
      }
      // Still send input for seq tracking, but don't predict horizontal movement
      this.pendingInputs.push({
        ...input,
        predictedPosition: { ...this._localState.position },
        predictedRotation: this._localState.rotation,
      });
      this.socket.emit('game:input', input);
      return;
    }

    // Predict locally
    const predicted = applyPhysics(this._localState, input);
    this._localState = predicted;

    this.pendingInputs.push({
      ...input,
      predictedPosition: { ...predicted.position },
      predictedRotation: predicted.rotation,
    });

    this.socket.emit('game:input', input);
  }

  private reconcile(serverState: PlayerState): void {
    // Discard acknowledged inputs
    this.pendingInputs = this.pendingInputs.filter(
      (i) => i.seq > serverState.lastProcessedInput
    );

    // Sync knockback state from server
    if (serverState.knockback) {
      this._localKnockback = { ...serverState.knockback };
    } else {
      this._localKnockback = null;
    }

    // Reset to server authoritative state
    let state: PhysicsState = {
      position: { ...serverState.position },
      velocity: { ...serverState.velocity },
      isGrounded: serverState.isGrounded,
      jumpHorizontalVelocity: { ...serverState.jumpHorizontalVelocity },
      rotation: serverState.rotation,
      targetRotation: serverState.targetRotation,
    };

    // During knockback, use knockback position instead of replaying inputs
    if (this._localKnockback) {
      const kb = getKnockbackPosition(this._localKnockback, Date.now());
      state.position.x = kb.x;
      state.position.z = kb.z;
      this._localState = state;
      return;
    }

    // Replay unacknowledged inputs
    for (const input of this.pendingInputs) {
      state = applyPhysics(state, input);
    }

    this._localState = state;
  }

  getInterpolatedState(id: string): PlayerState | null {
    const buffer = this.interpolationBuffers.get(id);
    if (!buffer || buffer.length === 0) return null;

    const renderTime = Date.now() - INTERPOLATION_DELAY_MS;

    // Find the two snapshots to interpolate between
    let i = 0;
    while (i < buffer.length - 1 && buffer[i + 1].timestamp <= renderTime) {
      i++;
    }

    if (i >= buffer.length - 1) {
      return buffer[buffer.length - 1].state;
    }

    const a = buffer[i];
    const b = buffer[i + 1];
    const t = (renderTime - a.timestamp) / (b.timestamp - a.timestamp);
    const clamped = Math.max(0, Math.min(1, t));

    return {
      ...b.state,
      position: {
        x: a.state.position.x + (b.state.position.x - a.state.position.x) * clamped,
        y: a.state.position.y + (b.state.position.y - a.state.position.y) * clamped,
        z: a.state.position.z + (b.state.position.z - a.state.position.z) * clamped,
      },
      rotation: lerpAngle(a.state.rotation, b.state.rotation, clamped),
    };
  }

  getOtherPlayerIds(): string[] {
    if (!this.latestState) return [];
    return Object.keys(this.latestState.players).filter((id) => id !== this._localId);
  }

  getPlayerColor(id: string): number {
    return this.latestState?.players[id]?.color ?? 0xcccccc;
  }

  getBufferSize(id: string): number {
    return this.interpolationBuffers.get(id)?.length ?? 0;
  }

  requestColorChange(color: number): void {
    this.socket.emit('player:colorChange', { color });
  }

  runScript(name: string): void {
    this.socket.emit('admin:runScript', { name });
  }

  getTakenColors(): Map<number, string> {
    const taken = new Map<number, string>();
    if (!this.latestState) return taken;
    for (const [id, player] of Object.entries(this.latestState.players)) {
      taken.set(player.color, id);
    }
    return taken;
  }
}

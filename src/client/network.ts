import { io, Socket } from 'socket.io-client';
import {
  PlayerInput,
  GameState,
  PlayerState,
  Vec3,
  INTERPOLATION_BUFFER_SIZE,
  INTERPOLATION_DELAY_MS,
  ServerToClientEvents,
  ClientToServerEvents,
} from '../shared/types.js';
import { applyPhysics, PhysicsState, normalizeAngle } from '../shared/physics.js';

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

  get localId(): string | null { return this._localId; }
  get localState(): PhysicsState | null { return this._localState; }
  get playerCount(): number { return this._playerCount; }
  get ping(): number { return this._ping; }
  get pendingCount(): number { return this.pendingInputs.length; }

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
  }

  connect(): void {
    this.socket.connect();
    this.socket.emit('game:join');
  }

  sendInput(input: PlayerInput): void {
    if (!this._localState) return;

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

    // Reset to server authoritative state
    let state: PhysicsState = {
      position: { ...serverState.position },
      velocity: { ...serverState.velocity },
      isGrounded: serverState.isGrounded,
      jumpHorizontalVelocity: { ...serverState.jumpHorizontalVelocity },
      rotation: serverState.rotation,
      targetRotation: serverState.targetRotation,
    };

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
}

// --- Constants ---
export const ARENA_SIZE = 40;
export const MAX_PLAYERS = 4;
export const SERVER_TICK_RATE = 60;
export const BROADCAST_RATE = 20;
export const PLAYER_SPEED = 5;
export const JUMP_VELOCITY = 8;
export const GRAVITY = -20;
export const INTERPOLATION_BUFFER_SIZE = 20;
export const INTERPOLATION_DELAY_MS = 100;
export const PLAYER_HEIGHT = 2.15;

export const PLAYER_COLORS = [0x4a90d9, 0xe74c3c, 0x2ecc71, 0xf39c12] as const;

// --- Interfaces ---
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface PlayerInput {
  seq: number;
  dt: number;
  dx: number; // -1, 0, 1 (left/right)
  dz: number; // -1, 0, 1 (forward/back)
  jump: boolean;
  cameraYaw: number;
}

export interface PlayerState {
  id: string;
  position: Vec3;
  velocity: Vec3;
  isGrounded: boolean;
  jumpHorizontalVelocity: Vec3;
  lastProcessedInput: number;
  color: number;
}

export interface GameState {
  players: Record<string, PlayerState>;
  timestamp: number;
}

// --- Socket Events ---
export interface ServerToClientEvents {
  'game:state': (state: GameState) => void;
  'game:joined': (data: { id: string; state: GameState }) => void;
  'game:playerLeft': (id: string) => void;
}

export interface ClientToServerEvents {
  'game:input': (input: PlayerInput) => void;
  'game:join': () => void;
}

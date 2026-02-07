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

export const PLAYER_COLORS = [
  0xe74c3c, // red
  0xf39c12, // orange
  0xf1c40f, // yellow
  0x2ecc71, // green
  0x4a90d9, // blue
  0x9b59b6, // purple
  0xffffff, // white
  0x555555, // darkgray
] as const;

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
  rotation: number;
  targetRotation: number;
  lastProcessedInput: number;
  color: number;
  knockback?: {
    startX: number;
    startZ: number;
    endX: number;
    endZ: number;
    startTime: number;
    duration: number;
  };
}

export interface MechanicStateData {
  type: string;
  [key: string]: unknown;
}

export interface GameState {
  players: Record<string, PlayerState>;
  mechanics: MechanicStateData[];
  timestamp: number;
}

// --- Socket Events ---
export interface ServerToClientEvents {
  'game:state': (state: GameState) => void;
  'game:joined': (data: { id: string; state: GameState }) => void;
  'game:playerLeft': (id: string) => void;
  'player:colorChanged': (data: { id: string; color: number }) => void;
}

export interface ClientToServerEvents {
  'game:input': (input: PlayerInput) => void;
  'game:join': () => void;
  'player:colorChange': (data: { color: number }) => void;
  'admin:spawnKnockback': () => void;
  'admin:runScript': (data: { name: string }) => void;
}

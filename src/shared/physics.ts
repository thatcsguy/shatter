import { Vec3, PlayerInput, PLAYER_SPEED, GRAVITY, JUMP_VELOCITY, ARENA_SIZE } from './types.js';

export interface PhysicsState {
  position: Vec3;
  velocity: Vec3;
  isGrounded: boolean;
}

export function applyPhysics(state: PhysicsState, input: PlayerInput): PhysicsState {
  const { dt } = input;

  // Compute camera-relative movement direction
  // Forward = (-sin(yaw), 0, -cos(yaw)), Right = (cos(yaw), 0, -sin(yaw))
  const cosYaw = Math.cos(input.cameraYaw);
  const sinYaw = Math.sin(input.cameraYaw);

  let moveX = input.dx * cosYaw + input.dz * -sinYaw;
  let moveZ = input.dx * -sinYaw + input.dz * -cosYaw;

  // Normalize diagonal movement
  const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
  if (len > 1) {
    moveX /= len;
    moveZ /= len;
  }

  // Horizontal position
  const newX = state.position.x + moveX * PLAYER_SPEED * dt;
  const newZ = state.position.z + moveZ * PLAYER_SPEED * dt;

  // Vertical physics
  let newVelY = state.velocity.y;
  let newGrounded = state.isGrounded;

  if (input.jump && state.isGrounded) {
    newVelY = JUMP_VELOCITY;
    newGrounded = false;
  }

  if (!newGrounded) {
    newVelY += GRAVITY * dt;
  }

  let newY = state.position.y + newVelY * dt;

  // Landing detection
  if (newY <= 0) {
    newY = 0;
    newVelY = 0;
    newGrounded = true;
  }

  return {
    position: {
      x: clamp(newX, 0, ARENA_SIZE),
      y: newY,
      z: clamp(newZ, 0, ARENA_SIZE),
    },
    velocity: {
      x: moveX * PLAYER_SPEED,
      y: newVelY,
      z: moveZ * PLAYER_SPEED,
    },
    isGrounded: newGrounded,
  };
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

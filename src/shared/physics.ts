import { Vec3, PlayerInput, PLAYER_SPEED, GRAVITY, JUMP_VELOCITY, ARENA_SIZE } from './types.js';

export interface PhysicsState {
  position: Vec3;
  velocity: Vec3;
  isGrounded: boolean;
  jumpHorizontalVelocity: Vec3;
  rotation: number;
  targetRotation: number;
}

const ROTATION_SPEED = 10;

export function normalizeAngle(a: number): number {
  let r = a % (2 * Math.PI);
  if (r > Math.PI) r -= 2 * Math.PI;
  if (r <= -Math.PI) r += 2 * Math.PI;
  return r;
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

  const inputVelX = moveX * PLAYER_SPEED;
  const inputVelZ = moveZ * PLAYER_SPEED;

  // Vertical physics
  let newVelY = state.velocity.y;
  let newGrounded = state.isGrounded;
  let jumpHVel = { ...state.jumpHorizontalVelocity };

  if (input.jump && state.isGrounded) {
    newVelY = JUMP_VELOCITY;
    newGrounded = false;
    // Snapshot horizontal velocity at jump start
    jumpHVel = { x: inputVelX, y: 0, z: inputVelZ };
  }

  if (!newGrounded) {
    newVelY += GRAVITY * dt;
  }

  // Use snapshotted velocity while airborne, input velocity while grounded
  const hVelX = newGrounded ? inputVelX : jumpHVel.x;
  const hVelZ = newGrounded ? inputVelZ : jumpHVel.z;

  const newX = state.position.x + hVelX * dt;
  const newZ = state.position.z + hVelZ * dt;
  let newY = state.position.y + newVelY * dt;

  // Landing detection
  if (newY <= 0) {
    newY = 0;
    newVelY = 0;
    newGrounded = true;
    jumpHVel = { x: 0, y: 0, z: 0 };
  }

  // Rotation
  const moveLen = Math.sqrt(moveX * moveX + moveZ * moveZ);
  let newTargetRotation = state.targetRotation;
  if (moveLen > 0.01) {
    newTargetRotation = Math.atan2(moveX, moveZ);
  }
  const diff = normalizeAngle(newTargetRotation - state.rotation);
  const maxStep = ROTATION_SPEED * dt;
  let newRotation: number;
  if (Math.abs(diff) <= maxStep) {
    newRotation = newTargetRotation;
  } else {
    newRotation = state.rotation + Math.sign(diff) * maxStep;
  }
  newRotation = normalizeAngle(newRotation);

  return {
    position: {
      x: clamp(newX, 0, ARENA_SIZE),
      y: newY,
      z: clamp(newZ, 0, ARENA_SIZE),
    },
    velocity: {
      x: hVelX,
      y: newVelY,
      z: hVelZ,
    },
    isGrounded: newGrounded,
    jumpHorizontalVelocity: jumpHVel,
    rotation: newRotation,
    targetRotation: newTargetRotation,
  };
}

export function applyVerticalPhysics(
  position: Vec3,
  velocity: Vec3,
  isGrounded: boolean,
  dt: number,
): { position: Vec3; velocity: Vec3; isGrounded: boolean } {
  let newVelY = velocity.y;
  let newGrounded = isGrounded;

  if (!newGrounded) {
    newVelY += GRAVITY * dt;
  }

  let newY = position.y + newVelY * dt;

  if (newY <= 0) {
    newY = 0;
    newVelY = 0;
    newGrounded = true;
  }

  return {
    position: { ...position, y: newY },
    velocity: { ...velocity, y: newVelY },
    isGrounded: newGrounded,
  };
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

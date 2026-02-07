import { PlayerInput, PlayerState, Vec3, ARENA_SIZE } from '../shared/types.js';
import { applyPhysics, applyVerticalPhysics, PhysicsState } from '../shared/physics.js';
import { KnockbackState, calculateKnockbackEndpoint, getKnockbackPosition } from '../shared/knockback.js';

export class Player {
  readonly id: string;
  color: number;
  position: Vec3;
  velocity: Vec3;
  isGrounded: boolean;
  jumpHorizontalVelocity: Vec3;
  rotation: number;
  targetRotation: number;
  lastProcessedInput: number;
  knockback: KnockbackState | null;
  private inputQueue: PlayerInput[];

  constructor(id: string, color: number) {
    this.id = id;
    this.color = color;
    this.position = { x: ARENA_SIZE / 2, y: 0, z: ARENA_SIZE / 2 };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.isGrounded = true;
    this.jumpHorizontalVelocity = { x: 0, y: 0, z: 0 };
    this.rotation = 0;
    this.targetRotation = 0;
    this.lastProcessedInput = 0;
    this.knockback = null;
    this.inputQueue = [];
  }

  queueInput(input: PlayerInput): void {
    this.inputQueue.push(input);
  }

  processInputs(now: number): void {
    // Update knockback position and check expiry
    if (this.knockback) {
      const kb = getKnockbackPosition(this.knockback, now);
      this.position.x = kb.x;
      this.position.z = kb.z;
      if (!kb.active) {
        this.knockback = null;
        this.velocity = { x: 0, y: this.velocity.y, z: 0 };
      }
    }

    for (const input of this.inputQueue) {
      if (this.knockback) {
        // During knockback, skip horizontal movement but apply vertical physics
        const vert = applyVerticalPhysics(this.position, this.velocity, this.isGrounded, input.dt);
        this.position = vert.position;
        this.velocity = vert.velocity;
        this.isGrounded = vert.isGrounded;
        if (this.isGrounded) {
          this.jumpHorizontalVelocity = { x: 0, y: 0, z: 0 };
        }
        this.lastProcessedInput = input.seq;
        continue;
      }

      const state: PhysicsState = {
        position: { ...this.position },
        velocity: { ...this.velocity },
        isGrounded: this.isGrounded,
        jumpHorizontalVelocity: { ...this.jumpHorizontalVelocity },
        rotation: this.rotation,
        targetRotation: this.targetRotation,
      };

      const result = applyPhysics(state, input);
      this.position = result.position;
      this.velocity = result.velocity;
      this.isGrounded = result.isGrounded;
      this.jumpHorizontalVelocity = result.jumpHorizontalVelocity;
      this.rotation = result.rotation;
      this.targetRotation = result.targetRotation;
      this.lastProcessedInput = input.seq;
    }
    this.inputQueue = [];
  }

  applyKnockback(dirX: number, dirZ: number, distance: number, duration: number, now: number): void {
    if (this.knockback) return; // No stacking

    const { endX, endZ } = calculateKnockbackEndpoint(
      this.position.x,
      this.position.z,
      dirX,
      dirZ,
      distance,
    );

    this.knockback = {
      startX: this.position.x,
      startZ: this.position.z,
      endX,
      endZ,
      startTime: now,
      duration,
    };

    // Zero horizontal velocity during knockback
    this.velocity = { x: 0, y: this.velocity.y, z: 0 };
  }

  toState(): PlayerState {
    const state: PlayerState = {
      id: this.id,
      position: { ...this.position },
      velocity: { ...this.velocity },
      isGrounded: this.isGrounded,
      jumpHorizontalVelocity: { ...this.jumpHorizontalVelocity },
      rotation: this.rotation,
      targetRotation: this.targetRotation,
      lastProcessedInput: this.lastProcessedInput,
      color: this.color,
    };
    if (this.knockback) {
      state.knockback = { ...this.knockback };
    }
    return state;
  }
}

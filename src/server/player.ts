import { PlayerInput, PlayerState, Vec3, ARENA_SIZE } from '../shared/types.js';
import { applyPhysics, PhysicsState } from '../shared/physics.js';

export class Player {
  readonly id: string;
  readonly color: number;
  position: Vec3;
  velocity: Vec3;
  isGrounded: boolean;
  jumpHorizontalVelocity: Vec3;
  lastProcessedInput: number;
  private inputQueue: PlayerInput[];

  constructor(id: string, color: number) {
    this.id = id;
    this.color = color;
    this.position = { x: ARENA_SIZE / 2, y: 0, z: ARENA_SIZE / 2 };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.isGrounded = true;
    this.jumpHorizontalVelocity = { x: 0, y: 0, z: 0 };
    this.lastProcessedInput = 0;
    this.inputQueue = [];
  }

  queueInput(input: PlayerInput): void {
    this.inputQueue.push(input);
  }

  processInputs(): void {
    for (const input of this.inputQueue) {
      const state: PhysicsState = {
        position: { ...this.position },
        velocity: { ...this.velocity },
        isGrounded: this.isGrounded,
        jumpHorizontalVelocity: { ...this.jumpHorizontalVelocity },
      };

      const result = applyPhysics(state, input);
      this.position = result.position;
      this.velocity = result.velocity;
      this.isGrounded = result.isGrounded;
      this.jumpHorizontalVelocity = result.jumpHorizontalVelocity;
      this.lastProcessedInput = input.seq;
    }
    this.inputQueue = [];
  }

  toState(): PlayerState {
    return {
      id: this.id,
      position: { ...this.position },
      velocity: { ...this.velocity },
      isGrounded: this.isGrounded,
      jumpHorizontalVelocity: { ...this.jumpHorizontalVelocity },
      lastProcessedInput: this.lastProcessedInput,
      color: this.color,
    };
  }
}

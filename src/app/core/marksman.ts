import { Vector3 } from "three";

export interface MarksmanContext {
  playerPosition: Vector3;
  enemyPosition: Vector3;
  spawnProjectile: (origin: Vector3, velocity: Vector3) => void;
}

export interface MarksmanOptions {
  projectileSpeed?: number;
}

export class Marksman {
  private readonly projectileSpeed: number;
  private readonly direction = new Vector3();
  private readonly origin = new Vector3();

  constructor(options?: MarksmanOptions) {
    this.projectileSpeed = options?.projectileSpeed ?? 14;
  }

  tryFire(context: MarksmanContext) {
    this.direction.copy(context.enemyPosition).sub(context.playerPosition);
    if (this.direction.lengthSq() === 0) {
      return;
    }

    this.direction.normalize();
    this.origin.copy(context.playerPosition).addScaledVector(this.direction, 0.6);

    const velocity = this.direction.clone().multiplyScalar(this.projectileSpeed);
    context.spawnProjectile(this.origin, velocity);
  }
}

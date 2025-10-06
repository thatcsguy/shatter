import { Vector3 } from "three";
import { MotionComponentType } from "@app/entities/components/motion";
import { TransformComponentType } from "@app/entities/components/transform";
import type { EntityWorld } from "@app/entities/world";
import type { EntitySystem } from "@app/entities/systems/entitySystem";

const EPSILON = 1e-5;

export class MovementSystem implements EntitySystem {
  readonly id = "movement";

  private readonly scratch = new Vector3();

  update(world: EntityWorld, deltaTime: number) {
    const entities = world.query([TransformComponentType, MotionComponentType]);
    for (const entity of entities) {
      const transform = entity.get(TransformComponentType);
      const motion = entity.get(MotionComponentType);

      const target = this.scratch.copy(motion.targetVelocity);
      const targetLengthSq = target.lengthSq();
      if (motion.maxSpeed !== Infinity && targetLengthSq > motion.maxSpeed * motion.maxSpeed) {
        target.setLength(motion.maxSpeed);
      }

      if (targetLengthSq > EPSILON && motion.acceleration > 0) {
        const lerpFactor = 1 - Math.exp(-motion.acceleration * deltaTime);
        motion.velocity.lerp(target, lerpFactor);
      } else if (targetLengthSq > EPSILON) {
        motion.velocity.copy(target);
      } else if (motion.friction > 0) {
        const damping = Math.exp(-motion.friction * deltaTime);
        motion.velocity.multiplyScalar(damping);
        if (motion.velocity.lengthSq() < EPSILON) {
          motion.velocity.set(0, 0, 0);
        }
      }

      transform.position.addScaledVector(motion.velocity, deltaTime);
    }
  }
}

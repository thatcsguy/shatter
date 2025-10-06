import { ColliderComponentType } from "@app/entities/components/collider";
import { TransformComponentType } from "@app/entities/components/transform";
import type { Entity } from "@app/entities/entity";
import { SpatialIndex } from "@app/entities/spatialIndex";
import type { EntityWorld } from "@app/entities/world";
import type { EntitySystem } from "@app/entities/systems/entitySystem";

export interface CollisionPair {
  readonly a: Entity;
  readonly b: Entity;
  readonly distance: number;
  readonly overlap: number;
}

export type CollisionListener = (pair: CollisionPair, world: EntityWorld) => void;

export class CollisionSystem implements EntitySystem {
  readonly id = "collision";

  private readonly index = new SpatialIndex();

  constructor(private readonly listener?: CollisionListener) {}

  update(world: EntityWorld, _deltaTime: number) {
    void _deltaTime;
    const entities = world.query([TransformComponentType, ColliderComponentType]);
    this.index.clear();

    for (const entity of entities) {
      const transform = entity.get(TransformComponentType);
      const collider = entity.get(ColliderComponentType);
      this.index.set(entity.id, transform.position, collider.radius);
    }

    for (const [aId, bId] of this.index.pairs()) {
      const a = world.getEntityById(aId);
      const b = world.getEntityById(bId);
      if (!a || !b || !a.isAlive() || !b.isAlive()) continue;

      const colliderA = a.get(ColliderComponentType);
      const colliderB = b.get(ColliderComponentType);
      if ((colliderA.mask & colliderB.layer) === 0 || (colliderB.mask & colliderA.layer) === 0) {
        continue;
      }

      const transformA = a.get(TransformComponentType);
      const transformB = b.get(TransformComponentType);
      const combinedRadius = colliderA.radius + colliderB.radius;
      const distance = Math.sqrt(transformA.position.distanceToSquared(transformB.position));
      if (distance > combinedRadius) continue;

      const overlap = combinedRadius - distance;
      this.listener?.(
        {
          a,
          b,
          distance,
          overlap
        },
        world
      );
    }
  }
}

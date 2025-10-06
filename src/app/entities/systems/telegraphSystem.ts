import { TelegraphComponentType } from "@app/entities/components/telegraph";
import type { EntityWorld } from "@app/entities/world";
import type { EntitySystem } from "@app/entities/systems/entitySystem";

export type TelegraphListener = (entityId: number) => void;

export class TelegraphSystem implements EntitySystem {
  readonly id = "telegraph";

  constructor(private readonly onComplete?: TelegraphListener) {}

  update(world: EntityWorld, deltaTime: number) {
    const entities = world.query([TelegraphComponentType]);
    for (const entity of entities) {
      const telegraph = entity.get(TelegraphComponentType);
      if (telegraph.completed) continue;

      telegraph.elapsed = Math.min(telegraph.elapsed + deltaTime, telegraph.duration);
      if (telegraph.elapsed >= telegraph.duration) {
        telegraph.completed = true;
        this.onComplete?.(entity.id);
      }
    }
  }
}

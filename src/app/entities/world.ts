import type { EntityBlueprint, Entity } from "@app/entities/entity";
import { instantiateBlueprint } from "@app/entities/entity";
import type { ComponentType } from "@app/entities/component";
import type { EntitySystem } from "@app/entities/systems/entitySystem";

export class EntityWorld {
  private idCounter = 1;
  private readonly entities = new Map<number, Entity>();
  private readonly blueprints = new Map<number, EntityBlueprint>();
  private readonly systems: EntitySystem[] = [];
  private readonly destroyQueue: Entity[] = [];

  spawn(blueprint: EntityBlueprint): Entity {
    return instantiateBlueprint(this, blueprint);
  }

  addSystem(system: EntitySystem) {
    this.systems.push(system);
    system.initialize?.(this);
  }

  update(deltaTime: number) {
    if (deltaTime === 0) return;

    for (const system of this.systems) {
      system.update(this, deltaTime);
    }

    for (const system of this.systems) {
      system.postUpdate?.(this, deltaTime);
    }

    this.flushDestroyed();
  }

  query(required: readonly ComponentType<unknown>[]): Entity[] {
    const result: Entity[] = [];
    for (const entity of this.entities.values()) {
      if (!entity.isAlive()) continue;
      let matches = true;
      for (const component of required) {
        if (!entity.has(component)) {
          matches = false;
          break;
        }
      }
      if (matches) {
        result.push(entity);
      }
    }
    return result;
  }

  findByTag(tag: string): Entity[] {
    const result: Entity[] = [];
    for (const entity of this.entities.values()) {
      if (!entity.isAlive()) continue;
      if (!entity.tags) continue;
      if (entity.tags.includes(tag)) {
        result.push(entity);
      }
    }
    return result;
  }

  getEntityById(id: number): Entity | null {
    return this.entities.get(id) ?? null;
  }

  /** @internal */
  nextEntityId(): number {
    return this.idCounter++;
  }

  /** @internal */
  registerEntity(entity: Entity, blueprint: EntityBlueprint) {
    this.entities.set(entity.id, entity);
    this.blueprints.set(entity.id, blueprint);
    blueprint.onSpawn?.(entity, this);
  }

  /** @internal */
  markForDestruction(entity: Entity) {
    this.destroyQueue.push(entity);
  }

  private flushDestroyed() {
    if (this.destroyQueue.length === 0) return;
    for (const entity of this.destroyQueue) {
      if (!this.entities.has(entity.id)) continue;
      const blueprint = this.blueprints.get(entity.id);
      this.blueprints.delete(entity.id);
      entity._setDead();
      blueprint?.onDestroy?.(entity, this);
      this.entities.delete(entity.id);
    }
    this.destroyQueue.length = 0;
  }
}

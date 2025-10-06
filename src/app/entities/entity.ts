import type { ComponentEntry, ComponentType } from "@app/entities/component";
import { applyComponentSetup } from "@app/entities/component";
import type { EntityWorld } from "@app/entities/world";

export type EntityId = number;

export interface EntityBlueprint {
  readonly name?: string;
  readonly tags?: readonly string[];
  readonly components: ReadonlyArray<ComponentEntry<unknown>>;
  readonly onSpawn?: (entity: Entity, world: EntityWorld) => void;
  readonly onDestroy?: (entity: Entity, world: EntityWorld) => void;
}

export class Entity {
  private alive = true;

  constructor(
    public readonly id: EntityId,
    private readonly world: EntityWorld,
    private readonly componentMap: Map<ComponentType<unknown>, unknown>,
    public readonly name: string | undefined,
    public readonly tags: readonly string[] | undefined
  ) {}

  isAlive(): boolean {
    return this.alive;
  }

  has<T>(type: ComponentType<T>): boolean {
    return this.componentMap.has(type);
  }

  get<T>(type: ComponentType<T>): T {
    const component = this.componentMap.get(type);
    if (component === undefined) {
      throw new Error(`Entity ${this.id} is missing component ${type.key}`);
    }
    return component as T;
  }

  tryGet<T>(type: ComponentType<T>): T | null {
    const component = this.componentMap.get(type) as T | undefined;
    return component ?? null;
  }

  destroy() {
    if (!this.alive) return;
    this.alive = false;
    this.world.markForDestruction(this);
  }

  /** @internal */
  _setDead() {
    this.alive = false;
  }
}

export function instantiateBlueprint(world: EntityWorld, blueprint: EntityBlueprint): Entity {
  const componentMap = new Map<ComponentType<unknown>, unknown>();

  for (const [type, setup] of blueprint.components) {
    const instance = applyComponentSetup(type.create(), setup);
    componentMap.set(type, instance);
  }

  const entity = new Entity(world.nextEntityId(), world, componentMap, blueprint.name, blueprint.tags);
  world.registerEntity(entity, blueprint);
  return entity;
}

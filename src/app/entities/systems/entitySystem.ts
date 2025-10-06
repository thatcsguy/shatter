import type { EntityWorld } from "@app/entities/world";

export interface EntitySystem {
  readonly id: string;
  initialize?(world: EntityWorld): void;
  update(world: EntityWorld, deltaTime: number): void;
  postUpdate?(world: EntityWorld, deltaTime: number): void;
}

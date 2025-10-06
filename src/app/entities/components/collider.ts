import { defineComponent } from "@app/entities/component";

export interface ColliderComponent {
  radius: number;
  layer: number;
  mask: number;
}

export const ColliderComponentType = defineComponent<ColliderComponent>("core.collider", () => ({
  radius: 0.5,
  layer: 1,
  mask: 0xffffffff
}));

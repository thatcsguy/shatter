import { Vector3 } from "three";
import { defineComponent } from "@app/entities/component";

export interface TransformComponent {
  position: Vector3;
  rotationY: number;
  scale: Vector3;
}

export const TransformComponentType = defineComponent<TransformComponent>("core.transform", () => ({
  position: new Vector3(),
  rotationY: 0,
  scale: new Vector3(1, 1, 1)
}));

import { Vector3 } from "three";
import { defineComponent } from "@app/entities/component";

export interface MotionComponent {
  velocity: Vector3;
  targetVelocity: Vector3;
  acceleration: number;
  friction: number;
  maxSpeed: number;
}

export const MotionComponentType = defineComponent<MotionComponent>("core.motion", () => ({
  velocity: new Vector3(),
  targetVelocity: new Vector3(),
  acceleration: 0,
  friction: 0,
  maxSpeed: Infinity
}));

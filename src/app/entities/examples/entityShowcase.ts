import { Color, Vector3 } from "three";
import { component } from "@app/entities/component";
import { ColliderComponentType } from "@app/entities/components/collider";
import type { MotionComponent } from "@app/entities/components/motion";
import { MotionComponentType } from "@app/entities/components/motion";
import { TelegraphComponentType, createTelegraphSequence } from "@app/entities/components/telegraph";
import type { TransformComponent } from "@app/entities/components/transform";
import { TransformComponentType } from "@app/entities/components/transform";
import type { EntityBlueprint } from "@app/entities/entity";
import type { EntityWorld } from "@app/entities/world";

export const PlayerBlueprint: EntityBlueprint = {
  name: "Player",
  tags: ["player"],
  components: [
    component<TransformComponent>(TransformComponentType, (transform) => transform.position.set(0, 0, 0)),
    component<MotionComponent>(MotionComponentType, (motion) => {
      motion.maxSpeed = 6;
      motion.acceleration = 24;
      motion.friction = 18;
    }),
    component(ColliderComponentType, { radius: 0.45, layer: 1, mask: 0xfffffffe })
  ]
};

export const RotatingHazardBlueprint: EntityBlueprint = {
  name: "Clockwise Orb",
  tags: ["hazard"],
  components: [
    component<TransformComponent>(TransformComponentType, (transform) => transform.position.set(2, 0, 2)),
    component(ColliderComponentType, { radius: 0.6, layer: 2, mask: 0xfffffffd }),
    component(TelegraphComponentType, (telegraph) => {
      const sequence = createTelegraphSequence(
        { label: "Charge", duration: 1.2, color: new Color("#ffcc00").getStyle() },
        { label: "Pulse", duration: 1.8, color: new Color("#ff3300").getStyle() }
      );
      telegraph.duration = sequence.duration;
      telegraph.segments = sequence.segments;
    })
  ]
};

export function spawnExampleEntities(world: EntityWorld) {
  const player = world.spawn(PlayerBlueprint);
  const hazard = world.spawn(RotatingHazardBlueprint);

  const playerTransform = player.get(TransformComponentType);
  playerTransform.position.copy(new Vector3(0, 0, 0));

  const hazardTransform = hazard.get(TransformComponentType);
  hazardTransform.position.copy(new Vector3(3.5, 0, -1.5));

  return { player, hazard };
}

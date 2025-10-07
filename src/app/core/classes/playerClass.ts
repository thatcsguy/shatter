import type { Vector3 } from "three";
import type { AbilityStatus, ClassGaugeState } from "@app/core/abilityHud";

export interface ProjectileSpawnOptions {
  scale?: number;
  color?: number;
}

export interface PlayerClassContext {
  playerPosition: Vector3;
  enemyPosition: Vector3;
  isPlayerMoving: boolean;
  spawnProjectile: (origin: Vector3, velocity: Vector3, options?: ProjectileSpawnOptions) => void;
  setCastProgress: (progress: number | null) => void;
}

export interface PlayerClass {
  update(deltaTime: number, context: PlayerClassContext): void;
  tryUseAbility(slot: number, context: PlayerClassContext): boolean;
  getAbilityStatuses(): AbilityStatus[];
  getGaugeState(): ClassGaugeState | undefined;
}

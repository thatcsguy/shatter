import type { Vector3 } from "three";
import type { AbilityStatus, ClassGaugeState } from "@app/core/abilityHud";
import type { DamageInstance, DamageResult, DamageSourceParams } from "@app/core/damage";

export type MeleeAttackStyle = "swing" | "thrust";

export interface MeleeAttackOptions {
  direction: Vector3;
  duration?: number;
  length?: number;
  width?: number;
  color?: number;
  arc?: number;
  style?: MeleeAttackStyle;
}

export interface ProjectileSpawnOptions {
  scale?: number;
  color?: number;
  damage?: DamageInstance;
}

export interface PlayerClassContext {
  playerPosition: Vector3;
  enemyPosition: Vector3;
  isPlayerMoving: boolean;
  spawnProjectile: (origin: Vector3, velocity: Vector3, options?: ProjectileSpawnOptions) => void;
  setCastProgress: (progress: number | null) => void;
  createDamageInstance: (params: DamageSourceParams) => DamageInstance;
  dealDamage: (instance: DamageInstance) => DamageResult;
  playMeleeAttack: (options: MeleeAttackOptions) => void;
}

export interface PlayerClass {
  update(deltaTime: number, context: PlayerClassContext): void;
  tryUseAbility(slot: number, context: PlayerClassContext): boolean;
  getAbilityStatuses(): AbilityStatus[];
  getGaugeState(): ClassGaugeState | undefined;
}

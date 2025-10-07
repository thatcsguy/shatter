import { Vector3 } from "three";
import type { AbilityStatus } from "@app/core/abilityHud";
import type {
  AbilityExecutionContext,
  ClassAbilityDefinition,
  ClassAbilityState
} from "@app/core/classes/abilities";
import type { PlayerClass, PlayerClassContext } from "@app/core/classes/playerClass";
import type { DamageTag } from "@app/core/damage";

const MARKSMAN_BASE_DAMAGE = 10;
const MARKSMAN_EMPOWERED_DAMAGE = 50;

export interface MarksmanOptions {
  projectileSpeed?: number;
}

export class Marksman implements PlayerClass {
  private readonly projectileSpeed: number;
  private readonly direction = new Vector3();
  private readonly origin = new Vector3();
  private readonly abilities: ClassAbilityState[];
  private readonly maxGauge = 100;
  private readonly gaugeGainPerUse = 10;
  private gauge = 0;

  constructor(options?: MarksmanOptions) {
    this.projectileSpeed = options?.projectileSpeed ?? 14;
    this.abilities = Array.from({ length: 4 }, (_, index) => ({
      definition: this.createAbilityDefinition(index),
      remainingCooldown: 0
    }));
  }

  update(deltaTime: number, context: PlayerClassContext) {
    void context;
    for (const ability of this.abilities) {
      if (ability.remainingCooldown > 0) {
        ability.remainingCooldown = Math.max(ability.remainingCooldown - deltaTime, 0);
      }
    }
  }

  tryUseAbility(slot: number, context: PlayerClassContext): boolean {
    const ability = this.abilities[slot];
    if (!ability || ability.remainingCooldown > 0) {
      return false;
    }

    const empowered = this.gauge >= this.maxGauge;

    ability.definition.execute(context, { empowered });
    ability.remainingCooldown = ability.definition.cooldown;

    if (empowered) {
      this.gauge = 0;
    } else {
      this.gauge = Math.min(this.gauge + this.gaugeGainPerUse, this.maxGauge);
    }

    return true;
  }

  getAbilityStatuses(): AbilityStatus[] {
    return this.abilities.map((ability, index) => ({
      id: ability.definition.id,
      slot: index,
      hotkey: ability.definition.hotkey,
      cooldown: ability.definition.cooldown,
      remainingCooldown: ability.remainingCooldown
    }));
  }

  getGaugeState() {
    return { type: "bar" as const, current: this.gauge, max: this.maxGauge };
  }

  private createAbilityDefinition(slot: number): ClassAbilityDefinition {
    const abilityId = `marksman-shot-${slot + 1}`;
    return {
      id: abilityId,
      hotkey: slot + 1,
      cooldown: 4,
      baseDamage: MARKSMAN_BASE_DAMAGE,
      execute: (context: PlayerClassContext, abilityContext?: AbilityExecutionContext) => {
        this.fire(context, abilityContext?.empowered ?? false, abilityId);
      }
    };
  }

  private fire(context: PlayerClassContext, empowered: boolean, abilityId: string) {
    this.direction.copy(context.enemyPosition).sub(context.playerPosition);
    if (this.direction.lengthSq() === 0) {
      return;
    }

    this.direction.normalize();
    this.origin.copy(context.playerPosition).addScaledVector(this.direction, 0.6);

    const velocity = this.direction.clone().multiplyScalar(this.projectileSpeed);
    const tags: DamageTag[] = empowered ? ["projectile", "empowered"] : ["projectile"];
    const baseDamage = empowered ? MARKSMAN_EMPOWERED_DAMAGE : MARKSMAN_BASE_DAMAGE;
    const damage = context.createDamageInstance({ abilityId, baseDamage, tags });
    context.spawnProjectile(this.origin, velocity, {
      scale: empowered ? 3 : 1,
      damage
    });
  }
}

import { Vector3 } from "three";
import type { AbilityStatus } from "@app/core/abilityHud";
import type { ClassAbilityDefinition, ClassAbilityState } from "@app/core/classes/abilities";
import { createPlaceholderAbilityDefinition } from "@app/core/classes/placeholderAbility";
import type { PlayerClass, PlayerClassContext } from "@app/core/classes/playerClass";
import type { DamageTag } from "@app/core/damage";

const MAX_COMBO_POINTS = 4;
const SLICE_COOLDOWN = 1;
const SLICE_DAMAGE = 10;
const SLICE_RANGE = 2.5;
const SLICE_ARC = Math.PI;
const SLICE_DURATION = 0.25;
const SLICE_LENGTH = 2.4;
const SLICE_WIDTH = 0.16;

const RUPTURE_COOLDOWN = 8;
const RUPTURE_RANGE = 2.5;
const RUPTURE_THRUST_DURATION = 0.35;
const RUPTURE_THRUST_LENGTH = 2.6;
const RUPTURE_THRUST_WIDTH = 0.14;
const RUPTURE_BLEED_BASE_DURATION = 4;
const RUPTURE_BLEED_DURATION_PER_COMBO = 4;
const RUPTURE_BLEED_TICK_DAMAGE = 10;
const BLEED_TICK_INTERVAL = 1;

const PIERCE_COOLDOWN = 6;
const PIERCE_BASE_DAMAGE = 20;
const PIERCE_BONUS_PER_COMBO = 10;
const PIERCE_PROJECTILE_SPEED = 18;
const PIERCE_PROJECTILE_SCALE = 0.9;

const SLICE_ABILITY_ID = "lancer-slice";
const RUPTURE_ABILITY_ID = "lancer-rupture";
const RUPTURE_BLEED_ABILITY_ID = "lancer-rupture-bleed";
const PIERCE_ABILITY_ID = "lancer-pierce";

export class Lancer implements PlayerClass {
  private readonly direction = new Vector3();
  private readonly origin = new Vector3();
  private readonly velocity = new Vector3();
  private readonly abilities: ClassAbilityState[];
  private comboPoints = 0;
  private bleedRemaining = 0;
  private bleedTotalDuration = 0;
  private bleedTickTimer = 0;

  constructor() {
    this.abilities = [
      { definition: this.createSliceDefinition(), remainingCooldown: 0 },
      { definition: this.createRuptureDefinition(), remainingCooldown: 0 },
      { definition: this.createPierceDefinition(), remainingCooldown: 0 },
      { definition: createPlaceholderAbilityDefinition("lancer-placeholder-4", 4), remainingCooldown: 0 }
    ];
  }

  update(deltaTime: number, context: PlayerClassContext) {
    for (const ability of this.abilities) {
      if (ability.remainingCooldown > 0) {
        ability.remainingCooldown = Math.max(ability.remainingCooldown - deltaTime, 0);
      }
    }

    this.updateBleed(deltaTime, context);
  }

  tryUseAbility(slot: number, context: PlayerClassContext): boolean {
    const ability = this.abilities[slot];
    if (!ability || ability.remainingCooldown > 0) {
      return false;
    }

    let used = false;
    switch (slot) {
      case 0:
        used = this.performSlice(context);
        break;
      case 1:
        used = this.performRupture(context);
        break;
      case 2:
        used = this.performPierce(context);
        break;
      default:
        ability.definition.execute(context);
        used = true;
        break;
    }

    if (!used) {
      return false;
    }

    ability.remainingCooldown = ability.definition.cooldown;
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
    return {
      type: "charges" as const,
      current: this.comboPoints,
      max: MAX_COMBO_POINTS,
      secondary:
        this.bleedTotalDuration > 0
          ? { current: this.bleedRemaining, max: this.bleedTotalDuration }
          : undefined
    };
  }

  private performSlice(context: PlayerClassContext): boolean {
    this.direction.copy(context.enemyPosition).sub(context.playerPosition);
    this.direction.y = 0;
    const distanceSq = this.direction.lengthSq();
    if (distanceSq === 0) {
      return false;
    }

    const inRange = distanceSq <= SLICE_RANGE * SLICE_RANGE;

    context.playMeleeAttack({
      direction: this.direction,
      arc: SLICE_ARC,
      duration: SLICE_DURATION,
      length: SLICE_LENGTH,
      width: SLICE_WIDTH,
      color: 0xfacc15,
      style: "swing"
    });

    if (!inRange) {
      return true;
    }

    const tags: DamageTag[] = ["melee", "physical"];
    const damage = context.createDamageInstance({
      abilityId: SLICE_ABILITY_ID,
      baseDamage: SLICE_DAMAGE,
      tags
    });
    context.dealDamage(damage);
    this.comboPoints = Math.min(this.comboPoints + 1, MAX_COMBO_POINTS);
    return true;
  }

  private performRupture(context: PlayerClassContext): boolean {
    this.direction.copy(context.enemyPosition).sub(context.playerPosition);
    this.direction.y = 0;
    const distanceSq = this.direction.lengthSq();
    if (distanceSq === 0 || distanceSq > RUPTURE_RANGE * RUPTURE_RANGE) {
      return false;
    }

    context.playMeleeAttack({
      direction: this.direction,
      duration: RUPTURE_THRUST_DURATION,
      length: RUPTURE_THRUST_LENGTH,
      width: RUPTURE_THRUST_WIDTH,
      color: 0x38bdf8,
      style: "thrust"
    });

    const consumed = this.comboPoints;
    this.comboPoints = 0;
    const totalDuration = RUPTURE_BLEED_BASE_DURATION + RUPTURE_BLEED_DURATION_PER_COMBO * consumed;
    this.bleedRemaining = totalDuration;
    this.bleedTotalDuration = totalDuration;
    this.bleedTickTimer = BLEED_TICK_INTERVAL;
    return true;
  }

  private performPierce(context: PlayerClassContext): boolean {
    this.direction.copy(context.enemyPosition).sub(context.playerPosition);
    this.direction.y = 0;
    if (this.direction.lengthSq() === 0) {
      return false;
    }

    this.direction.normalize();
    this.origin.copy(context.playerPosition).addScaledVector(this.direction, 0.6);
    this.velocity.copy(this.direction).multiplyScalar(PIERCE_PROJECTILE_SPEED);

    const consumed = this.comboPoints;
    this.comboPoints = 0;
    const baseDamage = PIERCE_BASE_DAMAGE + consumed * PIERCE_BONUS_PER_COMBO;
    const tags: DamageTag[] = ["projectile", "physical"];
    const damage = context.createDamageInstance({
      abilityId: PIERCE_ABILITY_ID,
      baseDamage,
      tags
    });

    context.spawnProjectile(this.origin, this.velocity, {
      scale: PIERCE_PROJECTILE_SCALE,
      color: 0xf59e0b,
      damage
    });

    return true;
  }

  private updateBleed(deltaTime: number, context: PlayerClassContext) {
    if (this.bleedRemaining <= 0) {
      return;
    }

    this.bleedRemaining = Math.max(this.bleedRemaining - deltaTime, 0);
    this.bleedTickTimer -= deltaTime;

    while (this.bleedTickTimer <= 0 && this.bleedRemaining > 0) {
      this.bleedTickTimer += BLEED_TICK_INTERVAL;
      const damage = context.createDamageInstance({
        abilityId: RUPTURE_BLEED_ABILITY_ID,
        baseDamage: RUPTURE_BLEED_TICK_DAMAGE,
        tags: ["physical"]
      });
      context.dealDamage(damage);
    }

    if (this.bleedRemaining <= 0) {
      this.bleedTotalDuration = 0;
      this.bleedTickTimer = 0;
    }
  }

  private createSliceDefinition(): ClassAbilityDefinition {
    return {
      id: SLICE_ABILITY_ID,
      hotkey: 1,
      cooldown: SLICE_COOLDOWN,
      baseDamage: SLICE_DAMAGE,
      execute: (context: PlayerClassContext) => {
        this.performSlice(context);
      }
    };
  }

  private createRuptureDefinition(): ClassAbilityDefinition {
    return {
      id: RUPTURE_ABILITY_ID,
      hotkey: 2,
      cooldown: RUPTURE_COOLDOWN,
      execute: (context: PlayerClassContext) => {
        this.performRupture(context);
      }
    };
  }

  private createPierceDefinition(): ClassAbilityDefinition {
    return {
      id: PIERCE_ABILITY_ID,
      hotkey: 3,
      cooldown: PIERCE_COOLDOWN,
      baseDamage: PIERCE_BASE_DAMAGE,
      execute: (context: PlayerClassContext) => {
        this.performPierce(context);
      }
    };
  }
}

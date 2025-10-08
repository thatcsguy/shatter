import { Vector3 } from "three";
import type { AbilityStatus, ClassGaugeState } from "@app/core/abilityHud";
import type {
  ClassAbilityDefinition,
  ClassAbilityState
} from "@app/core/classes/abilities";
import { createPlaceholderAbilityDefinition } from "@app/core/classes/placeholderAbility";
import type { PlayerClass, PlayerClassContext } from "@app/core/classes/playerClass";
import type { DamageInstance, DamageResult, DamageSourceParams, DamageTag } from "@app/core/damage";

const MAX_MANA = 100;
const MAX_HUNGER_STACKS = 4;
const HUNGER_DAMAGE_BONUS = 0.25;
const HUNGER_MANA_COST_BONUS = 0.25;

const ARCANE_BLAST_CAST_TIME = 2;
const ARCANE_BLAST_BASE_DAMAGE = 10;
const ARCANE_BLAST_BASE_COST = 15;
const ARCANE_BLAST_ID = "arcanist-arcane-blast";

const ARCANE_MISSILE_COUNT = 3;
const ARCANE_MISSILE_BASE_DAMAGE = 5;
const ARCANE_MISSILE_MANA_GAIN = 10;
const ARCANE_MISSILE_PROJECTILE_SPEED = 16;
const ARCANE_MISSILES_ID = "arcanist-arcane-missiles";

const EVOCATION_CAST_TIME = 5;
const EVOCATION_COOLDOWN = 20;
const EVOCATION_ID = "arcanist-evocation";

interface PendingCast {
  abilityIndex: number;
  castTime: number;
  elapsed: number;
  manaCost: number;
  onComplete: (context: PlayerClassContext) => void;
}

export class Arcanist implements PlayerClass {
  private readonly abilities: ClassAbilityState[];
  private readonly direction = new Vector3();
  private readonly origin = new Vector3();

  private readonly maxMana = MAX_MANA;
  private mana = MAX_MANA;
  private hungerStacks = 0;

  private activeCast: PendingCast | null = null;

  constructor() {
    this.abilities = [
      { definition: this.createArcaneBlastDefinition(), remainingCooldown: 0 },
      { definition: this.createArcaneMissilesDefinition(), remainingCooldown: 0 },
      { definition: this.createEvocationDefinition(), remainingCooldown: 0 },
      {
        definition: createPlaceholderAbilityDefinition("arcanist-placeholder-4", 4),
        remainingCooldown: 0
      }
    ];
  }

  update(deltaTime: number, context: PlayerClassContext) {
    for (const ability of this.abilities) {
      if (ability.remainingCooldown > 0) {
        ability.remainingCooldown = Math.max(ability.remainingCooldown - deltaTime, 0);
      }
    }

    if (!this.activeCast) {
      return;
    }

    if (context.isPlayerMoving) {
      this.cancelCast(context);
      return;
    }

    this.activeCast.elapsed += deltaTime;
    const progress = Math.min(this.activeCast.elapsed / this.activeCast.castTime, 1);
    context.setCastProgress(progress);

    if (this.activeCast.elapsed >= this.activeCast.castTime) {
      this.finishCast(context);
    }
  }

  tryUseAbility(slot: number, context: PlayerClassContext): boolean {
    const ability = this.abilities[slot];
    if (!ability) {
      return false;
    }

    if (slot === 0) {
      return this.tryStartArcaneBlast(ability, context);
    }

    if (slot === 1) {
      return this.tryUseArcaneMissiles(ability, context);
    }

    if (slot === 2) {
      return this.tryStartEvocation(ability, context);
    }

    if (ability.remainingCooldown > 0 || this.activeCast) {
      return false;
    }

    ability.definition.execute(context);
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

  getGaugeState(): ClassGaugeState {
    return {
      type: "manaHunger",
      manaCurrent: this.mana,
      manaMax: this.maxMana,
      hungerCurrent: this.hungerStacks,
      hungerMax: MAX_HUNGER_STACKS
    };
  }

  private tryStartArcaneBlast(ability: ClassAbilityState, context: PlayerClassContext): boolean {
    if (this.activeCast || ability.remainingCooldown > 0) {
      return false;
    }

    const manaCost = this.getManaCost(ARCANE_BLAST_BASE_COST);
    if (this.mana < manaCost) {
      return false;
    }

    this.beginCast(0, ARCANE_BLAST_CAST_TIME, manaCost, context, this.completeArcaneBlast);
    return true;
  }

  private tryUseArcaneMissiles(ability: ClassAbilityState, context: PlayerClassContext): boolean {
    if (ability.remainingCooldown > 0 || this.activeCast) {
      return false;
    }

    ability.definition.execute(context);
    ability.remainingCooldown = ability.definition.cooldown;
    return true;
  }

  private tryStartEvocation(ability: ClassAbilityState, context: PlayerClassContext): boolean {
    if (this.activeCast || ability.remainingCooldown > 0) {
      return false;
    }

    this.beginCast(2, EVOCATION_CAST_TIME, 0, context, this.completeEvocation);
    return true;
  }

  private beginCast(
    abilityIndex: number,
    castTime: number,
    manaCost: number,
    context: PlayerClassContext,
    onComplete: (ctx: PlayerClassContext) => void
  ) {
    this.activeCast = {
      abilityIndex,
      castTime,
      elapsed: 0,
      manaCost,
      onComplete
    };
    context.setCastProgress(0);
  }

  private finishCast(context: PlayerClassContext) {
    const cast = this.activeCast;
    if (!cast) {
      return;
    }

    this.activeCast = null;
    context.setCastProgress(null);

    if (cast.manaCost > 0) {
      this.spendMana(cast.manaCost);
    }

    cast.onComplete(context);

    const ability = this.abilities[cast.abilityIndex];
    if (ability && ability.definition.cooldown > 0) {
      ability.remainingCooldown = ability.definition.cooldown;
    }
  }

  private cancelCast(context: PlayerClassContext) {
    this.activeCast = null;
    context.setCastProgress(null);
  }

  private completeArcaneBlast = (context: PlayerClassContext) => {
    const damage = this.createScaledDamageInstance(context, {
      abilityId: ARCANE_BLAST_ID,
      baseDamage: ARCANE_BLAST_BASE_DAMAGE,
      tags: this.getMagicTags()
    });
    context.dealDamage(damage);
    this.addHungerStack();
  };

  private completeEvocation = (context: PlayerClassContext) => {
    void context;
    this.mana = this.maxMana;
  };

  private createArcaneBlastDefinition(): ClassAbilityDefinition {
    return {
      id: ARCANE_BLAST_ID,
      hotkey: 1,
      cooldown: 0,
      baseDamage: ARCANE_BLAST_BASE_DAMAGE,
      execute: () => {
        // Cast completion handled in completeArcaneBlast
      }
    };
  }

  private createArcaneMissilesDefinition(): ClassAbilityDefinition {
    return {
      id: ARCANE_MISSILES_ID,
      hotkey: 2,
      cooldown: 0,
      baseDamage: ARCANE_MISSILE_BASE_DAMAGE,
      execute: (context: PlayerClassContext) => {
        this.clearHungerStacks();
        this.restoreMana(ARCANE_MISSILE_MANA_GAIN);

        this.direction.copy(context.enemyPosition).sub(context.playerPosition);
        if (this.direction.lengthSq() === 0) {
          for (let i = 0; i < ARCANE_MISSILE_COUNT; i += 1) {
            const damage = this.createScaledDamageInstance(context, {
              abilityId: ARCANE_MISSILES_ID,
              baseDamage: ARCANE_MISSILE_BASE_DAMAGE,
              tags: this.getMagicTags()
            });
            context.dealDamage(damage);
          }
          return;
        }

        this.direction.normalize();
        this.origin.copy(context.playerPosition).addScaledVector(this.direction, 0.6);

        for (let i = 0; i < ARCANE_MISSILE_COUNT; i += 1) {
          const damage = this.createScaledDamageInstance(context, {
            abilityId: ARCANE_MISSILES_ID,
            baseDamage: ARCANE_MISSILE_BASE_DAMAGE,
            tags: this.getMagicTags(true)
          });
          const velocity = this.direction.clone().multiplyScalar(ARCANE_MISSILE_PROJECTILE_SPEED);
          context.spawnProjectile(this.origin, velocity, {
            color: 0x818cf8,
            damage
          });
        }
      }
    };
  }

  private createEvocationDefinition(): ClassAbilityDefinition {
    return {
      id: EVOCATION_ID,
      hotkey: 3,
      cooldown: EVOCATION_COOLDOWN,
      execute: () => {
        // Evocation effect handled when the cast completes.
      }
    };
  }

  private createScaledDamageInstance(
    context: PlayerClassContext,
    params: DamageSourceParams
  ): DamageInstance {
    const baseInstance = context.createDamageInstance(params);
    let cached: DamageResult | null = null;

    const instance: DamageInstance = {
      abilityId: baseInstance.abilityId,
      baseDamage: baseInstance.baseDamage,
      tags: baseInstance.tags,
      resolved: false,
      resolve: () => {
        if (!cached) {
          const baseResult = baseInstance.resolve();
          const multiplier = this.getDamageMultiplier();
          cached = {
            abilityId: baseResult.abilityId,
            baseDamage: baseResult.baseDamage,
            amount: baseResult.amount * multiplier,
            tags: baseResult.tags
          };
        }
        instance.resolved = true;
        return cached;
      }
    };

    return instance;
  }

  private getDamageMultiplier(): number {
    const manaBonus = 1 + this.mana / this.maxMana;
    const hungerBonus = 1 + this.hungerStacks * HUNGER_DAMAGE_BONUS;
    return manaBonus * hungerBonus;
  }

  private getManaCost(baseCost: number): number {
    return baseCost * (1 + this.hungerStacks * HUNGER_MANA_COST_BONUS);
  }

  private spendMana(amount: number) {
    this.mana = Math.max(this.mana - amount, 0);
  }

  private restoreMana(amount: number) {
    this.mana = Math.min(this.mana + amount, this.maxMana);
  }

  private addHungerStack() {
    this.hungerStacks = Math.min(this.hungerStacks + 1, MAX_HUNGER_STACKS);
  }

  private clearHungerStacks() {
    this.hungerStacks = 0;
  }

  private getMagicTags(includeProjectile = false): DamageTag[] {
    return includeProjectile ? ["magic", "projectile"] : ["magic"];
  }
}

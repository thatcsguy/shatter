import { Vector3 } from "three";
import type { AbilityStatus, ClassGaugeState } from "@app/core/abilityHud";
import type {
  AbilityExecutionContext,
  ClassAbilityDefinition,
  ClassAbilityState
} from "@app/core/classes/abilities";
import type {
  PlayerClass,
  PlayerClassContext,
  ProjectileRuntimeState
} from "@app/core/classes/playerClass";
import type { DamageInstance, DamageResult, DamageSourceParams, DamageTag } from "@app/core/damage";

const MAX_MANA = 100;
const MAX_HUNGER_STACKS = 4;
const HUNGER_DAMAGE_BONUS = 0.25;
const HUNGER_MANA_COST_BONUS = 0.25;

const ARCANE_BLAST_CAST_TIME = 2;
const ARCANE_BLAST_BASE_DAMAGE = 10;
const ARCANE_BLAST_BASE_COST = 15;
const ARCANE_BLAST_ID = "arcanist-arcane-blast";

const ARCANE_BARRAGE_BASE_DAMAGE = 10;
const ARCANE_BARRAGE_ID = "arcanist-arcane-barrage";
const ARCANE_BARRAGE_PROJECTILE_SPEED = 20;

const ARCANE_MISSILE_COUNT = 3;
const ARCANE_MISSILE_BASE_DAMAGE = 5;
const ARCANE_MISSILE_MANA_GAIN = 10;
const ARCANE_MISSILE_PROJECTILE_SPEED = 16;
const ARCANE_MISSILE_PROJECTILE_LIFETIME = 3;
const ARCANE_MISSILE_WAVE_AMPLITUDE = 0.8;
const ARCANE_MISSILE_WAVE_FREQUENCY = 7.5;
const ARCANE_MISSILE_PULSE_STRENGTH = 0.08;
const ARCANE_MISSILES_ID = "arcanist-arcane-missiles";

const EVOCATION_CAST_TIME = 5;
const EVOCATION_COOLDOWN = 20;
const EVOCATION_ID = "arcanist-evocation";

interface CastSnapshot {
  damageMultiplier?: number;
}

interface PendingCast {
  abilityIndex: number;
  castTime: number;
  elapsed: number;
  manaCost: number;
  snapshot: CastSnapshot;
  onComplete: (context: PlayerClassContext, snapshot: CastSnapshot) => void;
}

export class Arcanist implements PlayerClass {
  private readonly abilities: ClassAbilityState[];
  private readonly direction = new Vector3();
  private readonly origin = new Vector3();
  private readonly lateral = new Vector3();

  private readonly maxMana = MAX_MANA;
  private mana = MAX_MANA;
  private hungerStacks = 0;
  private hasClearcasting = false;

  private activeCast: PendingCast | null = null;

  constructor() {
    this.abilities = [
      { definition: this.createArcaneBlastDefinition(), remainingCooldown: 0 },
      { definition: this.createArcaneBarrageDefinition(), remainingCooldown: 0 },
      { definition: this.createArcaneMissilesDefinition(), remainingCooldown: 0 },
      { definition: this.createEvocationDefinition(), remainingCooldown: 0 }
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
      return this.tryUseArcaneBarrage(ability, context);
    }

    if (slot === 2) {
      return this.tryUseArcaneMissiles(ability, context);
    }

    if (slot === 3) {
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
      remainingCooldown: ability.remainingCooldown,
      highlighted: ability.definition.id === ARCANE_MISSILES_ID && this.hasClearcasting
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

    const castTime = this.getArcaneBlastCastTime();
    const snapshot: CastSnapshot = { damageMultiplier: this.getDamageMultiplierSnapshot() };
    this.beginCast(0, castTime, manaCost, context, this.completeArcaneBlast, snapshot);
    return true;
  }

  private tryUseArcaneBarrage(ability: ClassAbilityState, context: PlayerClassContext): boolean {
    if (ability.remainingCooldown > 0 || this.activeCast) {
      return false;
    }

    const stacksConsumed = this.hungerStacks;
    const damageMultiplier = this.getDamageMultiplierSnapshot() * (1 + stacksConsumed);

    this.clearHungerStacks();

    ability.definition.execute(context, { damageMultiplier });
    ability.remainingCooldown = ability.definition.cooldown;
    return true;
  }

  private tryUseArcaneMissiles(ability: ClassAbilityState, context: PlayerClassContext): boolean {
    if (!this.hasClearcasting || ability.remainingCooldown > 0 || this.activeCast) {
      return false;
    }

    const damageMultiplier = this.getDamageMultiplierSnapshot();
    ability.definition.execute(context, { damageMultiplier });
    ability.remainingCooldown = ability.definition.cooldown;
    this.hasClearcasting = false;
    return true;
  }

  private tryStartEvocation(ability: ClassAbilityState, context: PlayerClassContext): boolean {
    if (this.activeCast || ability.remainingCooldown > 0) {
      return false;
    }

    this.beginCast(3, EVOCATION_CAST_TIME, 0, context, this.completeEvocation);
    return true;
  }

  private beginCast(
    abilityIndex: number,
    castTime: number,
    manaCost: number,
    context: PlayerClassContext,
    onComplete: (ctx: PlayerClassContext, snapshot: CastSnapshot) => void,
    snapshot: CastSnapshot = {}
  ) {
    this.activeCast = {
      abilityIndex,
      castTime,
      elapsed: 0,
      manaCost,
      snapshot,
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

    cast.onComplete(context, cast.snapshot);

    const ability = this.abilities[cast.abilityIndex];
    if (ability && ability.definition.cooldown > 0) {
      ability.remainingCooldown = ability.definition.cooldown;
    }
  }

  private cancelCast(context: PlayerClassContext) {
    this.activeCast = null;
    context.setCastProgress(null);
  }

  private completeArcaneBlast = (context: PlayerClassContext, snapshot: CastSnapshot) => {
    const damageMultiplier = snapshot.damageMultiplier ?? this.getDamageMultiplierSnapshot();
    const damage = this.createScaledDamageInstance(
      context,
      {
        abilityId: ARCANE_BLAST_ID,
        baseDamage: ARCANE_BLAST_BASE_DAMAGE,
        tags: this.getMagicTags()
      },
      damageMultiplier
    );
    context.dealDamage(damage);
    this.addHungerStack();

    if (Math.random() < 0.15) {
      this.hasClearcasting = true;
    }
  };

  private completeEvocation = (context: PlayerClassContext, _snapshot: CastSnapshot) => {
    void context;
    void _snapshot;
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

  private createArcaneBarrageDefinition(): ClassAbilityDefinition {
    return {
      id: ARCANE_BARRAGE_ID,
      hotkey: 2,
      cooldown: 0,
      baseDamage: ARCANE_BARRAGE_BASE_DAMAGE,
      execute: (context: PlayerClassContext, abilityContext?: AbilityExecutionContext) => {
        this.castArcaneBarrage(context, abilityContext?.damageMultiplier);
      }
    };
  }

  private castArcaneBarrage(context: PlayerClassContext, damageMultiplier?: number) {
    const damage = this.createScaledDamageInstance(
      context,
      {
        abilityId: ARCANE_BARRAGE_ID,
        baseDamage: ARCANE_BARRAGE_BASE_DAMAGE,
        tags: this.getMagicTags(true)
      },
      damageMultiplier ?? this.getDamageMultiplierSnapshot()
    );
    this.direction.copy(context.enemyPosition).sub(context.playerPosition);
    if (this.direction.lengthSq() === 0) {
      context.dealDamage(damage);
      return;
    }

    this.direction.normalize();
    this.origin.copy(context.playerPosition).addScaledVector(this.direction, 0.65);
    const baseScale = 1.15;
    const origin = this.origin.clone();
    const velocity = this.direction.clone().multiplyScalar(ARCANE_BARRAGE_PROJECTILE_SPEED);

    context.spawnProjectile(origin, velocity, {
      color: 0xf472b6,
      scale: baseScale,
      damage,
      lifetime: 2.4,
      onUpdate: (projectile, _deltaTime) => {
        void _deltaTime;
        const pulse = baseScale * (1 + 0.12 * Math.sin(projectile.age * 8));
        projectile.mesh.scale.setScalar(pulse);
      }
    });
  }

  private createArcaneMissilesDefinition(): ClassAbilityDefinition {
    return {
      id: ARCANE_MISSILES_ID,
      hotkey: 3,
      cooldown: 0,
      baseDamage: ARCANE_MISSILE_BASE_DAMAGE,
      execute: (context: PlayerClassContext, abilityContext?: AbilityExecutionContext) => {
        this.castArcaneMissiles(context, abilityContext?.damageMultiplier);
      }
    };
  }

  private castArcaneMissiles(context: PlayerClassContext, damageMultiplier?: number) {
    this.restoreMana(ARCANE_MISSILE_MANA_GAIN);

    const multiplier = damageMultiplier ?? this.getDamageMultiplierSnapshot();

    this.direction.copy(context.enemyPosition).sub(context.playerPosition);
    if (this.direction.lengthSq() === 0) {
      for (let i = 0; i < ARCANE_MISSILE_COUNT; i += 1) {
        const damage = this.createScaledDamageInstance(
          context,
          {
            abilityId: ARCANE_MISSILES_ID,
            baseDamage: ARCANE_MISSILE_BASE_DAMAGE,
            tags: this.getMagicTags()
          },
          multiplier
        );
        context.dealDamage(damage);
      }
      return;
    }

    this.direction.normalize();
    this.origin.copy(context.playerPosition).addScaledVector(this.direction, 0.6);
    this.lateral.set(-this.direction.z, 0, this.direction.x);
    const hasLateral = this.lateral.lengthSq() > 0;
    if (hasLateral) {
      this.lateral.normalize();
    }

    const baseVelocity = this.direction.clone().multiplyScalar(ARCANE_MISSILE_PROJECTILE_SPEED);

    for (let i = 0; i < ARCANE_MISSILE_COUNT; i += 1) {
      const damage = this.createScaledDamageInstance(
        context,
        {
          abilityId: ARCANE_MISSILES_ID,
          baseDamage: ARCANE_MISSILE_BASE_DAMAGE,
          tags: this.getMagicTags(true)
        },
        multiplier
      );
      const origin = this.origin.clone();
      if (hasLateral) {
        origin.addScaledVector(this.lateral, (i - 1) * 0.22);
      }

      const velocity = baseVelocity.clone();
      context.spawnProjectile(origin, velocity, {
        color: 0xc7d2fe,
        damage,
        lifetime: ARCANE_MISSILE_PROJECTILE_LIFETIME,
        onUpdate:
          i === 0 || !hasLateral
            ? (projectile, _deltaTime) => {
                void _deltaTime;
                const pulse = 1 + ARCANE_MISSILE_PULSE_STRENGTH * Math.sin(projectile.age * 10);
                projectile.mesh.scale.setScalar(pulse);
              }
            : this.createMissileWaveBehavior(i === 1 ? 0 : Math.PI)
      });
    }
  }

  private createMissileWaveBehavior(phase: number) {
    const waveDirection = this.lateral.clone();
    return (projectile: ProjectileRuntimeState, _deltaTime: number) => {
      void _deltaTime;
      const lifeProgress = Math.min(projectile.age / ARCANE_MISSILE_PROJECTILE_LIFETIME, 1);
      const offset = Math.sin(projectile.age * ARCANE_MISSILE_WAVE_FREQUENCY + phase);
      const falloff = 1 - lifeProgress;
      projectile.displayPosition.addScaledVector(
        waveDirection,
        offset * ARCANE_MISSILE_WAVE_AMPLITUDE * falloff
      );
      const pulse = 1 + ARCANE_MISSILE_PULSE_STRENGTH * Math.sin(projectile.age * 12 + phase);
      projectile.mesh.scale.setScalar(pulse);
    };
  }

  private createEvocationDefinition(): ClassAbilityDefinition {
    return {
      id: EVOCATION_ID,
      hotkey: 4,
      cooldown: EVOCATION_COOLDOWN,
      execute: () => {
        // Evocation effect handled when the cast completes.
      }
    };
  }

  private createScaledDamageInstance(
    context: PlayerClassContext,
    params: DamageSourceParams,
    damageMultiplier: number
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
          cached = {
            abilityId: baseResult.abilityId,
            baseDamage: baseResult.baseDamage,
            amount: baseResult.amount * damageMultiplier,
            tags: baseResult.tags
          };
        }
        instance.resolved = true;
        return cached;
      }
    };

    return instance;
  }

  private getArcaneBlastCastTime(): number {
    const reduction = this.hungerStacks * 0.1;
    const multiplier = Math.max(0, 1 - reduction);
    return ARCANE_BLAST_CAST_TIME * multiplier;
  }

  private getDamageMultiplier(): number {
    const manaBonus = 1 + this.mana / this.maxMana;
    const hungerBonus = 1 + this.hungerStacks * HUNGER_DAMAGE_BONUS;
    return manaBonus * hungerBonus;
  }

  private getDamageMultiplierSnapshot(): number {
    return this.getDamageMultiplier();
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

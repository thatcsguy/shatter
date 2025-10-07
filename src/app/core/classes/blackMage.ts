import { Vector3 } from "three";
import type { AbilityStatus } from "@app/core/abilityHud";
import type { ClassAbilityDefinition, ClassAbilityState } from "@app/core/classes/abilities";
import { createPlaceholderAbilityDefinition } from "@app/core/classes/placeholderAbility";
import type { PlayerClass, PlayerClassContext } from "@app/core/classes/playerClass";

const DARK_BOLT_CAST_TIME = 2;
const DARK_BOLT_INSTANT_COOLDOWN = 2;
const FLOW_STATE_COOLDOWN = 10;
const MAX_FLOW_STATE_CHARGES = 3;
const DARK_BOLT_PROJECTILE_SPEED = 12;

export class BlackMage implements PlayerClass {
  private readonly direction = new Vector3();
  private readonly origin = new Vector3();
  private readonly abilities: ClassAbilityState[];
  private isCasting = false;
  private castElapsed = 0;
  private charges = 0;

  constructor() {
    this.abilities = [
      { definition: this.createDarkBoltDefinition(), remainingCooldown: 0 },
      { definition: this.createFlowStateDefinition(), remainingCooldown: 0 },
      {
        definition: createPlaceholderAbilityDefinition("black-mage-placeholder-3", 3),
        remainingCooldown: 0
      },
      {
        definition: createPlaceholderAbilityDefinition("black-mage-placeholder-4", 4),
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

    if (!this.isCasting) {
      return;
    }

    if (context.isPlayerMoving) {
      this.cancelCast(context);
      return;
    }

    this.castElapsed += deltaTime;
    const progress = Math.min(this.castElapsed / DARK_BOLT_CAST_TIME, 1);
    context.setCastProgress(progress);

    if (this.castElapsed >= DARK_BOLT_CAST_TIME) {
      this.completeCast(context);
    }
  }

  tryUseAbility(slot: number, context: PlayerClassContext): boolean {
    const ability = this.abilities[slot];
    if (!ability) {
      return false;
    }

    if (slot === 0) {
      return this.tryUseDarkBolt(ability, context);
    }

    if (ability.remainingCooldown > 0) {
      return false;
    }

    if (slot === 1) {
      this.activateFlowState();
      ability.remainingCooldown = ability.definition.cooldown;
      return true;
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

  getGaugeState() {
    return {
      type: "charges" as const,
      current: this.charges,
      max: MAX_FLOW_STATE_CHARGES
    };
  }

  private tryUseDarkBolt(ability: ClassAbilityState, context: PlayerClassContext): boolean {
    if (ability.remainingCooldown > 0 || this.isCasting) {
      return false;
    }

    if (this.charges > 0) {
      this.charges -= 1;
      ability.remainingCooldown = ability.definition.cooldown;
      this.fireDarkBolt(context);
      return true;
    }

    this.isCasting = true;
    this.castElapsed = 0;
    context.setCastProgress(0);
    return true;
  }

  private cancelCast(context: PlayerClassContext) {
    this.isCasting = false;
    this.castElapsed = 0;
    context.setCastProgress(null);
  }

  private completeCast(context: PlayerClassContext) {
    this.isCasting = false;
    this.castElapsed = 0;
    context.setCastProgress(null);
    this.fireDarkBolt(context);
  }

  private activateFlowState() {
    this.charges = MAX_FLOW_STATE_CHARGES;
  }

  private fireDarkBolt(context: PlayerClassContext) {
    const ability = this.abilities[0];
    ability.definition.execute(context);
  }

  private createDarkBoltDefinition(): ClassAbilityDefinition {
    return {
      id: "black-mage-dark-bolt",
      hotkey: 1,
      cooldown: DARK_BOLT_INSTANT_COOLDOWN,
      execute: (context: PlayerClassContext) => {
        this.direction.copy(context.enemyPosition).sub(context.playerPosition);
        if (this.direction.lengthSq() === 0) {
          return;
        }

        this.direction.normalize();
        this.origin.copy(context.playerPosition).addScaledVector(this.direction, 0.6);

        const velocity = this.direction.clone().multiplyScalar(DARK_BOLT_PROJECTILE_SPEED);
        context.spawnProjectile(this.origin, velocity, { color: 0x111827 });
      }
    };
  }

  private createFlowStateDefinition(): ClassAbilityDefinition {
    return {
      id: "black-mage-flow-state",
      hotkey: 2,
      cooldown: FLOW_STATE_COOLDOWN,
      execute: () => {
        // Flow State effect handled in tryUseAbility
      }
    };
  }
}

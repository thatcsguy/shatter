import { Vector3 } from "three";

export interface ProjectileSpawnOptions {
  scale?: number;
}

export interface MarksmanContext {
  playerPosition: Vector3;
  enemyPosition: Vector3;
  spawnProjectile: (origin: Vector3, velocity: Vector3, options?: ProjectileSpawnOptions) => void;
}

export interface MarksmanOptions {
  projectileSpeed?: number;
}

interface AbilityExecutionContext {
  empowered: boolean;
}

interface AbilityDefinition {
  id: string;
  hotkey: number;
  cooldown: number;
  execute: (context: MarksmanContext, abilityContext: AbilityExecutionContext) => void;
}

interface AbilityState {
  definition: AbilityDefinition;
  remainingCooldown: number;
}

export interface MarksmanAbilityStatus {
  id: string;
  slot: number;
  hotkey: number;
  cooldown: number;
  remainingCooldown: number;
}

export interface MarksmanGaugeStatus {
  current: number;
  max: number;
}

export class Marksman {
  private readonly projectileSpeed: number;
  private readonly direction = new Vector3();
  private readonly origin = new Vector3();
  private readonly abilities: AbilityState[];
  private readonly maxGauge = 100;
  private readonly gaugeGainPerUse = 10;
  private gauge = 0;

  constructor(options?: MarksmanOptions) {
    this.projectileSpeed = options?.projectileSpeed ?? 14;
    this.abilities = Array.from({ length: 4 }, (_, index) => ({
      definition: {
        id: `marksman-shot-${index + 1}`,
        hotkey: index + 1,
        cooldown: 4,
        execute: (context: MarksmanContext, abilityContext: AbilityExecutionContext) => {
          this.fire(context, abilityContext.empowered);
        }
      },
      remainingCooldown: 0
    }));
  }

  update(deltaTime: number) {
    for (const ability of this.abilities) {
      if (ability.remainingCooldown > 0) {
        ability.remainingCooldown = Math.max(ability.remainingCooldown - deltaTime, 0);
      }
    }
  }

  tryUseAbility(slot: number, context: MarksmanContext): boolean {
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

  getAbilityStatuses(): MarksmanAbilityStatus[] {
    return this.abilities.map((ability, index) => ({
      id: ability.definition.id,
      slot: index,
      hotkey: ability.definition.hotkey,
      cooldown: ability.definition.cooldown,
      remainingCooldown: ability.remainingCooldown
    }));
  }

  getGaugeStatus(): MarksmanGaugeStatus {
    return { current: this.gauge, max: this.maxGauge };
  }

  private fire(context: MarksmanContext, empowered: boolean) {
    this.direction.copy(context.enemyPosition).sub(context.playerPosition);
    if (this.direction.lengthSq() === 0) {
      return;
    }

    this.direction.normalize();
    this.origin.copy(context.playerPosition).addScaledVector(this.direction, 0.6);

    const velocity = this.direction.clone().multiplyScalar(this.projectileSpeed);
    context.spawnProjectile(this.origin, velocity, { scale: empowered ? 3 : 1 });
  }
}

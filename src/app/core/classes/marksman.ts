import { Vector3 } from "three";

export interface MarksmanContext {
  playerPosition: Vector3;
  enemyPosition: Vector3;
  spawnProjectile: (origin: Vector3, velocity: Vector3) => void;
}

export interface MarksmanOptions {
  projectileSpeed?: number;
}

interface AbilityDefinition {
  id: string;
  hotkey: number;
  cooldown: number;
  execute: (context: MarksmanContext) => void;
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

export class Marksman {
  private readonly projectileSpeed: number;
  private readonly direction = new Vector3();
  private readonly origin = new Vector3();
  private readonly abilities: AbilityState[];

  constructor(options?: MarksmanOptions) {
    this.projectileSpeed = options?.projectileSpeed ?? 14;
    this.abilities = Array.from({ length: 4 }, (_, index) => ({
      definition: {
        id: `marksman-shot-${index + 1}`,
        hotkey: index + 1,
        cooldown: 4,
        execute: (context: MarksmanContext) => {
          this.fire(context);
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

    ability.definition.execute(context);
    ability.remainingCooldown = ability.definition.cooldown;
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

  private fire(context: MarksmanContext) {
    this.direction.copy(context.enemyPosition).sub(context.playerPosition);
    if (this.direction.lengthSq() === 0) {
      return;
    }

    this.direction.normalize();
    this.origin.copy(context.playerPosition).addScaledVector(this.direction, 0.6);

    const velocity = this.direction.clone().multiplyScalar(this.projectileSpeed);
    context.spawnProjectile(this.origin, velocity);
  }
}

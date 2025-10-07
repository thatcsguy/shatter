import type { ClassAbilityDefinition } from "@app/core/classes/abilities";

export type DamageTag =
  | "projectile"
  | "melee"
  | "empowered"
  | "magic"
  | "physical";

export interface DamageSourceParams {
  abilityId: ClassAbilityDefinition["id"];
  baseDamage: number;
  tags?: DamageTag[];
}

export interface DamageResult {
  abilityId: ClassAbilityDefinition["id"];
  baseDamage: number;
  amount: number;
  tags: readonly DamageTag[];
}

export interface DamageInstance {
  abilityId: ClassAbilityDefinition["id"];
  baseDamage: number;
  readonly tags: readonly DamageTag[];
  resolved: boolean;
  resolve(): DamageResult;
}

export interface DamageModificationContext {
  readonly abilityId: ClassAbilityDefinition["id"];
  readonly baseDamage: number;
  readonly tags: readonly DamageTag[];
  amount: number;
}

export type DamageModifier = (context: DamageModificationContext) => void;

export class DamageEngine {
  private readonly modifiers: DamageModifier[] = [];

  createInstance(params: DamageSourceParams): DamageInstance {
    const tags = params.tags ? [...params.tags] : [];
    let cached: DamageResult | null = null;

    const instance: DamageInstance = {
      abilityId: params.abilityId,
      baseDamage: params.baseDamage,
      tags,
      resolved: false,
      resolve: () => {
        if (!cached) {
          cached = this.evaluate(params.abilityId, params.baseDamage, tags);
        }
        instance.resolved = true;
        return cached;
      }
    };

    return instance;
  }

  resolve(instance: DamageInstance): DamageResult {
    return instance.resolve();
  }

  registerModifier(modifier: DamageModifier) {
    this.modifiers.push(modifier);
  }

  private evaluate(
    abilityId: ClassAbilityDefinition["id"],
    baseDamage: number,
    tags: readonly DamageTag[]
  ): DamageResult {
    const context: DamageModificationContext = {
      abilityId,
      baseDamage,
      amount: baseDamage,
      tags
    };

    for (const modifier of this.modifiers) {
      modifier(context);
    }

    return {
      abilityId,
      baseDamage,
      amount: context.amount,
      tags
    };
  }
}

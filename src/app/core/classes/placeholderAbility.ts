import type { ClassAbilityDefinition } from "@app/core/classes/abilities";

export function createPlaceholderAbilityDefinition(id: string, hotkey: number): ClassAbilityDefinition {
  return {
    id,
    hotkey,
    cooldown: 5,
    execute: () => {
      // Intentionally empty placeholder ability.
    }
  };
}

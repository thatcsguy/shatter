import type { PlayerClassContext } from "@app/core/classes/playerClass";

export interface AbilityExecutionContext {
  empowered?: boolean;
}

export interface ClassAbilityDefinition {
  id: string;
  hotkey: number;
  cooldown: number;
  execute: (context: PlayerClassContext, abilityContext?: AbilityExecutionContext) => void;
}

export interface ClassAbilityState {
  definition: ClassAbilityDefinition;
  remainingCooldown: number;
}

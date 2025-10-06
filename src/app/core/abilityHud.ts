export interface AbilityStatus {
  id: string;
  slot: number;
  hotkey: number;
  cooldown: number;
  remainingCooldown: number;
}

interface AbilitySlotElements {
  cooldownOverlay: HTMLDivElement;
  cooldownText: HTMLSpanElement;
  keyLabel: HTMLSpanElement;
}

export class AbilityHud {
  private readonly container: HTMLDivElement;
  private readonly slots = new Map<number, AbilitySlotElements>();

  constructor(private readonly host: HTMLElement, abilities: AbilityStatus[]) {
    this.container = document.createElement("div");
    this.container.className = "ability-bar";

    const sorted = [...abilities].sort((a, b) => a.slot - b.slot);
    for (const ability of sorted) {
      const slot = document.createElement("div");
      slot.className = "ability-slot";

      const keyLabel = document.createElement("span");
      keyLabel.className = "ability-slot__label";
      keyLabel.textContent = ability.hotkey.toString();
      slot.appendChild(keyLabel);

      const cooldownOverlay = document.createElement("div");
      cooldownOverlay.className = "ability-slot__cooldown";
      cooldownOverlay.style.display = "none";

      const cooldownText = document.createElement("span");
      cooldownOverlay.appendChild(cooldownText);
      slot.appendChild(cooldownOverlay);

      this.slots.set(ability.slot, {
        cooldownOverlay,
        cooldownText,
        keyLabel
      });

      this.container.appendChild(slot);
    }

    this.host.appendChild(this.container);
  }

  update(statuses: AbilityStatus[]) {
    for (const status of statuses) {
      const slot = this.slots.get(status.slot);
      if (!slot) continue;

      slot.keyLabel.textContent = status.hotkey.toString();

      if (status.remainingCooldown > 0) {
        slot.cooldownOverlay.style.display = "flex";
        slot.cooldownText.textContent = status.remainingCooldown.toFixed(1);
      } else {
        slot.cooldownOverlay.style.display = "none";
        slot.cooldownText.textContent = "";
      }
    }
  }

  dispose() {
    this.container.remove();
    this.slots.clear();
  }
}

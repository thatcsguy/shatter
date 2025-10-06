export interface AbilityStatus {
  id: string;
  slot: number;
  hotkey: number;
  cooldown: number;
  remainingCooldown: number;
}

export type ClassGaugeState =
  | {
      type: "bar";
      current: number;
      max: number;
    };

export interface AbilityHudState {
  abilities: AbilityStatus[];
  gauge?: ClassGaugeState;
}

interface AbilitySlotElements {
  cooldownOverlay: HTMLDivElement;
  cooldownText: HTMLSpanElement;
  keyLabel: HTMLSpanElement;
}

export class AbilityHud {
  private readonly root: HTMLDivElement;
  private readonly gaugeContainer: HTMLDivElement;
  private readonly gaugeTrack: HTMLDivElement;
  private readonly gaugeFill: HTMLDivElement;
  private readonly container: HTMLDivElement;
  private readonly slots = new Map<number, AbilitySlotElements>();

  constructor(private readonly host: HTMLElement, state: AbilityHudState) {
    this.root = document.createElement("div");
    this.root.className = "ability-hud";

    this.gaugeContainer = document.createElement("div");
    this.gaugeContainer.className = "class-gauge";

    this.gaugeTrack = document.createElement("div");
    this.gaugeTrack.className = "class-gauge__track";

    this.gaugeFill = document.createElement("div");
    this.gaugeFill.className = "class-gauge__fill";
    this.gaugeTrack.appendChild(this.gaugeFill);
    this.gaugeContainer.appendChild(this.gaugeTrack);

    this.root.appendChild(this.gaugeContainer);

    this.container = document.createElement("div");
    this.container.className = "ability-bar";

    const sorted = [...state.abilities].sort((a, b) => a.slot - b.slot);
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

    this.root.appendChild(this.container);
    this.host.appendChild(this.root);

    this.updateGauge(state.gauge);
  }

  update(state: AbilityHudState) {
    for (const status of state.abilities) {
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

    this.updateGauge(state.gauge);
  }

  dispose() {
    this.root.remove();
    this.slots.clear();
  }

  private updateGauge(gauge: ClassGaugeState | undefined) {
    if (!gauge) {
      this.gaugeContainer.style.visibility = "hidden";
      this.gaugeFill.style.width = "0%";
      return;
    }

    this.gaugeContainer.style.visibility = "visible";

    if (gauge.type === "bar") {
      const ratio = gauge.max === 0 ? 0 : Math.min(Math.max(gauge.current / gauge.max, 0), 1);
      this.gaugeTrack.style.display = "block";
      this.gaugeFill.style.width = `${ratio * 100}%`;
      return;
    }

    this.gaugeTrack.style.display = "none";
    this.gaugeFill.style.width = "0%";
  }
}

interface DebugOverlayStats {
  fps: number;
  deltaMs: number;
  position: { x: number; z: number };
  speed: number;
}

interface DebugOverlayClassOption {
  id: string;
  label: string;
}

interface DebugOverlayClassSelection {
  options: DebugOverlayClassOption[];
  current: string;
  onSelect: (id: string) => void;
}

export interface DebugOverlayDamageTrackerState {
  dps: number;
  elapsed: number;
  duration: number;
  active: boolean;
  locked: boolean;
}

export interface DebugOverlayDamageTrackerControls {
  onReset: () => void;
}

export class DebugOverlay {
  private readonly root: HTMLDivElement;
  private readonly fpsEl: HTMLDivElement;
  private readonly deltaEl: HTMLDivElement;
  private readonly positionEl: HTMLDivElement;
  private readonly speedEl: HTMLDivElement;
  private readonly classContainer: HTMLDivElement;
  private readonly classButtonsRow: HTMLDivElement;
  private readonly classButtons = new Map<string, HTMLButtonElement>();
  private classSelectionCallback: ((id: string) => void) | null = null;
  private currentClassId: string | null = null;
  private visible = false;
  private readonly damageSection: HTMLDivElement;
  private readonly damageDpsEl: HTMLDivElement;
  private readonly damageTimerEl: HTMLDivElement;
  private readonly damageResetButton: HTMLButtonElement;
  private damageResetCallback: (() => void) | null = null;
  private lastDamageState: DebugOverlayDamageTrackerState | null = null;

  constructor(private readonly host: HTMLElement) {
    this.root = document.createElement("div");
    this.root.style.position = "absolute";
    this.root.style.top = "12px";
    this.root.style.left = "12px";
    this.root.style.padding = "10px 12px";
    this.root.style.background = "rgba(15, 23, 42, 0.85)";
    this.root.style.border = "1px solid rgba(148, 163, 184, 0.3)";
    this.root.style.borderRadius = "8px";
    this.root.style.fontFamily =
      "ui-monospace, SFMono-Regular, SFMono, Consolas, Liberation Mono, Menlo, monospace";
    this.root.style.fontSize = "12px";
    this.root.style.lineHeight = "18px";
    this.root.style.color = "#f8fafc";
    this.root.style.pointerEvents = "auto";
    this.root.style.display = "none";
    this.root.style.zIndex = "100";

    const title = document.createElement("div");
    title.textContent = "DEBUG";
    title.style.fontWeight = "600";
    title.style.marginBottom = "4px";
    this.root.appendChild(title);

    this.classContainer = document.createElement("div");
    this.classContainer.style.display = "none";
    this.classContainer.style.marginBottom = "8px";
    this.root.appendChild(this.classContainer);

    const classLabel = document.createElement("div");
    classLabel.textContent = "Class";
    classLabel.style.fontWeight = "600";
    classLabel.style.marginBottom = "4px";
    this.classContainer.appendChild(classLabel);

    this.classButtonsRow = document.createElement("div");
    this.classButtonsRow.style.display = "flex";
    this.classButtonsRow.style.flexWrap = "wrap";
    this.classButtonsRow.style.gap = "6px";
    this.classButtonsRow.style.pointerEvents = "auto";
    this.classContainer.appendChild(this.classButtonsRow);

    this.fpsEl = this.createRow();
    this.deltaEl = this.createRow();
    this.positionEl = this.createRow();
    this.speedEl = this.createRow();

    this.damageSection = document.createElement("div");
    this.damageSection.style.marginTop = "8px";
    this.damageSection.style.paddingTop = "8px";
    this.damageSection.style.borderTop = "1px solid rgba(148, 163, 184, 0.25)";

    const damageTitle = document.createElement("div");
    damageTitle.textContent = "Damage Tracker";
    damageTitle.style.fontWeight = "600";
    damageTitle.style.marginBottom = "4px";
    this.damageSection.appendChild(damageTitle);

    this.damageDpsEl = document.createElement("div");
    this.damageDpsEl.textContent = "DPS: 0.0";
    this.damageSection.appendChild(this.damageDpsEl);

    this.damageTimerEl = document.createElement("div");
    this.damageTimerEl.textContent = "Timer: 0.0 / 60.0s";
    this.damageSection.appendChild(this.damageTimerEl);

    this.damageResetButton = document.createElement("button");
    this.damageResetButton.type = "button";
    this.damageResetButton.textContent = "Reset";
    this.damageResetButton.style.marginTop = "6px";
    this.damageResetButton.style.padding = "4px 10px";
    this.damageResetButton.style.borderRadius = "6px";
    this.damageResetButton.style.border = "1px solid rgba(148, 163, 184, 0.35)";
    this.damageResetButton.style.background = "rgba(30, 41, 59, 0.6)";
    this.damageResetButton.style.color = "#f8fafc";
    this.damageResetButton.style.fontSize = "11px";
    this.damageResetButton.style.fontWeight = "600";
    this.damageResetButton.style.cursor = "pointer";
    this.damageResetButton.addEventListener("click", () => {
      if (this.damageResetCallback) {
        this.damageResetCallback();
      }
    });
    this.damageSection.appendChild(this.damageResetButton);

    this.root.appendChild(this.damageSection);

    this.host.appendChild(this.root);
  }

  setVisible(visible: boolean) {
    this.visible = visible;
    this.root.style.display = visible ? "block" : "none";

    if (visible && this.lastDamageState) {
      this.renderDamageTracker(this.lastDamageState);
    }
  }

  toggle() {
    this.setVisible(!this.visible);
  }

  setClassOptions(selection: DebugOverlayClassSelection) {
    this.classButtons.clear();
    this.classButtonsRow.replaceChildren();

    if (selection.options.length === 0) {
      this.classContainer.style.display = "none";
      this.classSelectionCallback = null;
      this.currentClassId = null;
      return;
    }

    this.classSelectionCallback = selection.onSelect;
    this.classContainer.style.display = "block";

    for (const option of selection.options) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = option.label;
      button.style.padding = "4px 8px";
      button.style.borderRadius = "6px";
      button.style.border = "1px solid rgba(148, 163, 184, 0.35)";
      button.style.background = "rgba(30, 41, 59, 0.6)";
      button.style.color = "#f8fafc";
      button.style.fontSize = "11px";
      button.style.fontWeight = "600";
      button.style.cursor = "pointer";
      button.style.transition = "background 0.2s ease-out, border-color 0.2s ease-out, opacity 0.2s ease-out";
      button.addEventListener("click", () => {
        if (this.classSelectionCallback) {
          this.classSelectionCallback(option.id);
        }
      });
      this.classButtonsRow.appendChild(button);
      this.classButtons.set(option.id, button);
    }

    this.setCurrentClass(selection.current);
  }

  setCurrentClass(id: string) {
    this.currentClassId = id;
    for (const [optionId, button] of this.classButtons.entries()) {
      const active = optionId === id;
      button.disabled = active;
      button.style.opacity = active ? "1" : "0.8";
      button.style.background = active ? "rgba(56, 189, 248, 0.3)" : "rgba(30, 41, 59, 0.6)";
      button.style.borderColor = active ? "rgba(56, 189, 248, 0.6)" : "rgba(148, 163, 184, 0.35)";
      button.style.cursor = active ? "default" : "pointer";
    }
  }

  update(stats: DebugOverlayStats) {
    if (!this.visible) return;
    this.fpsEl.textContent = `FPS: ${stats.fps.toFixed(1)}`;
    this.deltaEl.textContent = `Δms: ${stats.deltaMs.toFixed(2)}`;
    this.positionEl.textContent = `Pos: ${stats.position.x.toFixed(2)}, ${stats.position.z.toFixed(2)}`;
    this.speedEl.textContent = `Speed: ${stats.speed.toFixed(2)}`;
  }

  setDamageTrackerControls(controls: DebugOverlayDamageTrackerControls) {
    this.damageResetCallback = controls.onReset;
  }

  updateDamageTracker(state: DebugOverlayDamageTrackerState) {
    this.lastDamageState = state;
    if (!this.visible) return;
    this.renderDamageTracker(state);
  }

  dispose() {
    this.host.removeChild(this.root);
    this.classButtons.clear();
  }

  private createRow() {
    const row = document.createElement("div");
    row.textContent = "";
    this.root.appendChild(row);
    return row;
  }

  private renderDamageTracker(state: DebugOverlayDamageTrackerState) {
    const dpsValue = state.dps;
    this.damageDpsEl.textContent = `DPS: ${dpsValue.toFixed(1)}`;
    const elapsed = state.locked ? state.duration : state.elapsed;
    this.damageTimerEl.textContent = `Timer: ${elapsed.toFixed(1)} / ${state.duration.toFixed(0)}s`;
    this.damageResetButton.disabled = false;
    this.damageResetButton.style.opacity = state.active ? "1" : "0.85";
  }
}

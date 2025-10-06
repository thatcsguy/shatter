interface DebugOverlayStats {
  fps: number;
  deltaMs: number;
  position: { x: number; z: number };
  speed: number;
}

export class DebugOverlay {
  private readonly root: HTMLDivElement;
  private readonly fpsEl: HTMLDivElement;
  private readonly deltaEl: HTMLDivElement;
  private readonly positionEl: HTMLDivElement;
  private readonly speedEl: HTMLDivElement;
  private visible = false;

  constructor(private readonly host: HTMLElement) {
    this.root = document.createElement("div");
    this.root.style.position = "absolute";
    this.root.style.top = "12px";
    this.root.style.left = "12px";
    this.root.style.padding = "10px 12px";
    this.root.style.background = "rgba(15, 23, 42, 0.85)";
    this.root.style.border = "1px solid rgba(148, 163, 184, 0.3)";
    this.root.style.borderRadius = "8px";
    this.root.style.fontFamily = "ui-monospace, SFMono-Regular, SFMono, Consolas, Liberation Mono, Menlo, monospace";
    this.root.style.fontSize = "12px";
    this.root.style.lineHeight = "18px";
    this.root.style.color = "#f8fafc";
    this.root.style.pointerEvents = "none";
    this.root.style.display = "none";
    this.root.style.zIndex = "100";

    const title = document.createElement("div");
    title.textContent = "DEBUG";
    title.style.fontWeight = "600";
    title.style.marginBottom = "4px";
    this.root.appendChild(title);

    this.fpsEl = this.createRow();
    this.deltaEl = this.createRow();
    this.positionEl = this.createRow();
    this.speedEl = this.createRow();

    this.host.appendChild(this.root);
  }

  setVisible(visible: boolean) {
    this.visible = visible;
    this.root.style.display = visible ? "block" : "none";
  }

  toggle() {
    this.setVisible(!this.visible);
  }

  update(stats: DebugOverlayStats) {
    if (!this.visible) return;
    this.fpsEl.textContent = `FPS: ${stats.fps.toFixed(1)}`;
    this.deltaEl.textContent = `Δms: ${stats.deltaMs.toFixed(2)}`;
    this.positionEl.textContent = `Pos: ${stats.position.x.toFixed(2)}, ${stats.position.z.toFixed(2)}`;
    this.speedEl.textContent = `Speed: ${stats.speed.toFixed(2)}`;
  }

  dispose() {
    this.host.removeChild(this.root);
  }

  private createRow() {
    const row = document.createElement("div");
    row.textContent = "";
    this.root.appendChild(row);
    return row;
  }
}

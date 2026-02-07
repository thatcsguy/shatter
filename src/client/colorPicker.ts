import { PLAYER_COLORS } from '../shared/types.js';

export class ColorPicker {
  private container: HTMLDivElement;
  private swatches: HTMLDivElement[] = [];
  private onColorSelect: ((color: number) => void) | null = null;

  constructor() {
    this.container = document.createElement('div');
    this.container.style.cssText =
      'position:fixed;left:10px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:6px;z-index:100;';
    document.body.appendChild(this.container);

    for (const color of PLAYER_COLORS) {
      const swatch = document.createElement('div');
      const hex = '#' + color.toString(16).padStart(6, '0');
      swatch.style.cssText =
        `width:28px;height:28px;border-radius:50%;background:${hex};cursor:pointer;border:3px solid transparent;box-sizing:border-box;transition:opacity 0.15s;`;
      swatch.addEventListener('click', () => {
        if (swatch.dataset.disabled !== 'true' && this.onColorSelect) {
          this.onColorSelect(color);
        }
      });
      this.container.appendChild(swatch);
      this.swatches.push(swatch);
    }
  }

  setOnColorSelect(cb: (color: number) => void): void {
    this.onColorSelect = cb;
  }

  update(localColor: number, takenColors: Map<number, string>, localId: string): void {
    for (let i = 0; i < PLAYER_COLORS.length; i++) {
      const color = PLAYER_COLORS[i];
      const swatch = this.swatches[i];
      const owner = takenColors.get(color);
      const isMine = color === localColor;
      const isTaken = owner !== undefined && owner !== localId;

      swatch.style.borderColor = isMine ? '#fff' : 'transparent';
      swatch.style.opacity = isTaken ? '0.3' : '1';
      swatch.style.cursor = isTaken ? 'default' : 'pointer';
      swatch.dataset.disabled = isTaken ? 'true' : 'false';
    }
  }
}

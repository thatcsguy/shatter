export class HUD {
  private container: HTMLDivElement;
  private playerCountEl: HTMLDivElement;
  private debugEl: HTMLDivElement;
  private debugInfoEl: HTMLDivElement;
  private debugVisible = false;

  constructor(onRunScript?: (name: string) => void) {
    this.container = document.createElement('div');
    this.container.style.cssText = 'position:fixed;top:10px;left:10px;font-family:monospace;color:#fff;text-shadow:1px 1px 2px #000;z-index:100;';
    document.body.appendChild(this.container);

    this.playerCountEl = document.createElement('div');
    this.playerCountEl.style.cssText = 'font-size:14px;margin-bottom:8px;';
    this.container.appendChild(this.playerCountEl);

    this.debugEl = document.createElement('div');
    this.debugEl.style.cssText = 'font-size:12px;background:rgba(0,0,0,0.5);padding:8px;border-radius:4px;display:none;';
    this.container.appendChild(this.debugEl);

    this.debugInfoEl = document.createElement('div');
    this.debugEl.appendChild(this.debugInfoEl);

    if (onRunScript) {
      const btn = document.createElement('button');
      btn.textContent = 'Knockfest';
      btn.style.cssText = 'margin-top:8px;padding:4px 8px;font-family:monospace;font-size:12px;cursor:pointer;';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        onRunScript('knockfest');
      });
      this.debugEl.appendChild(btn);
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'F3') {
        e.preventDefault();
        this.debugVisible = !this.debugVisible;
        this.debugEl.style.display = this.debugVisible ? 'block' : 'none';
      }
    });
  }

  update(data: {
    playerCount: number;
    ping: number;
    pendingInputs: number;
    bufferSize: number;
  }): void {
    this.playerCountEl.textContent = `Players: ${data.playerCount}`;

    if (this.debugVisible) {
      this.debugInfoEl.innerHTML = [
        `Ping: ${data.ping}ms`,
        `Pending inputs: ${data.pendingInputs}`,
        `Interp buffer: ${data.bufferSize}`,
      ].join('<br>');
    }
  }
}

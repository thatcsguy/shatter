export interface DebugControlsCallbacks {
  toggleOverlay(): void;
  resetPlayer(): void;
}

export class DebugControls {
  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (event.code === "F1") {
      event.preventDefault();
      this.callbacks.toggleOverlay();
    }

    if (event.code === "F2") {
      event.preventDefault();
      this.callbacks.resetPlayer();
    }
  };

  constructor(private readonly callbacks: DebugControlsCallbacks) {
    window.addEventListener("keydown", this.handleKeyDown);
  }

  dispose() {
    window.removeEventListener("keydown", this.handleKeyDown);
  }
}

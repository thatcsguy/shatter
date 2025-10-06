export type MovementInput = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
};

const DEFAULT_INPUT: MovementInput = {
  up: false,
  down: false,
  left: false,
  right: false
};

export class KeyboardController {
  private readonly state: MovementInput = { ...DEFAULT_INPUT };

  constructor() {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  dispose(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
  }

  snapshot(): MovementInput {
    return { ...this.state };
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (event.repeat) return;
    this.setKey(event.code, true);
  };

  private readonly handleKeyUp = (event: KeyboardEvent) => {
    this.setKey(event.code, false);
  };

  private setKey(code: string, pressed: boolean) {
    switch (code) {
      case "KeyW":
      case "ArrowUp":
        this.state.up = pressed;
        break;
      case "KeyS":
      case "ArrowDown":
        this.state.down = pressed;
        break;
      case "KeyA":
      case "ArrowLeft":
        this.state.left = pressed;
        break;
      case "KeyD":
      case "ArrowRight":
        this.state.right = pressed;
        break;
      default:
        break;
    }
  }
}

export type MovementInput = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  ability1: boolean;
  ability2: boolean;
  ability3: boolean;
  ability4: boolean;
};

const DEFAULT_INPUT: MovementInput = {
  up: false,
  down: false,
  left: false,
  right: false,
  ability1: false,
  ability2: false,
  ability3: false,
  ability4: false
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
    const snapshot = { ...this.state };
    this.state.ability1 = false;
    this.state.ability2 = false;
    this.state.ability3 = false;
    this.state.ability4 = false;
    return snapshot;
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
      case "Digit1":
        if (pressed) {
          this.state.ability1 = true;
        }
        break;
      case "Digit2":
        if (pressed) {
          this.state.ability2 = true;
        }
        break;
      case "Digit3":
        if (pressed) {
          this.state.ability3 = true;
        }
        break;
      case "Digit4":
        if (pressed) {
          this.state.ability4 = true;
        }
        break;
      default:
        break;
    }
  }
}

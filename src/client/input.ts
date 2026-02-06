import { PlayerInput } from '../shared/types.js';

const GAMEPAD_DEADZONE = 0.1;

export class InputManager {
  private keys = new Set<string>();
  private mouseButtons = new Set<number>();
  private mouseDelta = { x: 0, y: 0 };
  private isPointerLocked = false;
  private seq = 0;
  private canvas: HTMLCanvasElement;
  private gamepadIndex: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseButtons.clear();
    });

    canvas.addEventListener('mousedown', (e) => {
      this.mouseButtons.add(e.button);
      if ((e.button === 0 || e.button === 2) && !this.isPointerLocked && canvas.requestPointerLock) {
        canvas.requestPointerLock();
      }
    });
    window.addEventListener('mouseup', (e) => {
      this.mouseButtons.delete(e.button);
      if (
        this.isPointerLocked &&
        !this.mouseButtons.has(0) &&
        !this.mouseButtons.has(2) &&
        document.exitPointerLock
      ) {
        document.exitPointerLock();
      }
    });
    canvas.addEventListener('mousemove', (e) => {
      this.mouseDelta.x += e.movementX;
      this.mouseDelta.y += e.movementY;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === canvas;
    });

    window.addEventListener('gamepadconnected', (e) => {
      this.gamepadIndex = e.gamepad.index;
    });
    window.addEventListener('gamepaddisconnected', (e) => {
      if (this.gamepadIndex === e.gamepad.index) {
        this.gamepadIndex = null;
      }
    });
  }

  private getGamepad(): Gamepad | null {
    if (this.gamepadIndex === null) return null;
    return navigator.getGamepads()[this.gamepadIndex] ?? null;
  }

  isMouseButtonDown(button: number): boolean {
    return this.mouseButtons.has(button);
  }

  getMouseDelta(): { x: number; y: number } {
    return { x: this.mouseDelta.x, y: this.mouseDelta.y };
  }

  resetMouseDelta(): void {
    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;
  }

  getGamepadRightStick(): { x: number; y: number } {
    const gp = this.getGamepad();
    if (!gp) return { x: 0, y: 0 };
    const x = gp.axes[2] ?? 0;
    const y = gp.axes[3] ?? 0;
    if (Math.abs(x) < GAMEPAD_DEADZONE && Math.abs(y) < GAMEPAD_DEADZONE) return { x: 0, y: 0 };
    return { x, y };
  }

  isGamepadButtonDown(index: number): boolean {
    const gp = this.getGamepad();
    if (!gp) return false;
    return gp.buttons[index]?.pressed ?? false;
  }

  sample(dt: number, cameraYaw: number): PlayerInput {
    let dx = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    let dz = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0);
    let jump = this.keys.has('Space');

    // Both mouse buttons held = move forward
    if (this.mouseButtons.has(0) && this.mouseButtons.has(2)) {
      dz = 1;
    }

    // Merge gamepad left stick
    const gp = this.getGamepad();
    if (gp) {
      const lx = gp.axes[0] ?? 0;
      const ly = gp.axes[1] ?? 0;
      if (Math.abs(lx) > GAMEPAD_DEADZONE || Math.abs(ly) > GAMEPAD_DEADZONE) {
        dx += lx;
        dz += -ly; // stick up (negative) = forward (positive dz)
      }
      // Button 0 (A/Cross) = jump
      if (gp.buttons[0]?.pressed) {
        jump = true;
      }
    }

    return {
      seq: ++this.seq,
      dt,
      dx,
      dz,
      jump,
      cameraYaw,
    };
  }
}

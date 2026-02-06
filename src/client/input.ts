import { PlayerInput } from '../shared/types.js';

export class InputManager {
  private keys = new Set<string>();
  private mouseButtons = new Set<number>();
  private mouseDelta = { x: 0, y: 0 };
  private isPointerLocked = false;
  private seq = 0;
  private canvas: HTMLCanvasElement;

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

  sample(dt: number, cameraYaw: number): PlayerInput {
    let dx = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    let dz = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0);
    const jump = this.keys.has('Space');

    // Both mouse buttons held = move forward
    if (this.mouseButtons.has(0) && this.mouseButtons.has(2)) {
      dz = 1;
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

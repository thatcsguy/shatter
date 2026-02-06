import { PlayerInput } from '../shared/types.js';

export class InputManager {
  private keys = new Set<string>();
  private seq = 0;

  constructor() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
    });
  }

  sample(dt: number, cameraYaw: number): PlayerInput | null {
    const dx = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    const dz = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0);
    const jump = this.keys.has('Space');

    if (dx === 0 && dz === 0 && !jump) return null;

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

import * as THREE from 'three';
import { PLAYER_HEIGHT } from '../shared/types';
import { InputManager } from './input.js';

const ROTATION_SENSITIVITY = 0.003;
const GAMEPAD_ROTATION_SPEED = 2.5;
const GAMEPAD_ZOOM_SPEED = 15;
const GAMEPAD_ZOOM_MODIFIER_BUTTON = 4; // LB

export class CameraController {
  readonly camera: THREE.PerspectiveCamera;
  private yaw = 0;
  private pitch = 0.5;
  private distance = 15;
  private target = new THREE.Vector3();
  private input: InputManager;
  private dt = 0;

  get cameraYaw(): number { return this.yaw; }

  constructor(canvas: HTMLCanvasElement, input: InputManager) {
    this.input = input;
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.distance = Math.max(5, Math.min(30, this.distance + e.deltaY * 0.01));
    }, { passive: false });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  update(targetPos: { x: number; y: number; z: number }, dt?: number): void {
    this.dt = dt ?? 0;

    // Mouse camera rotation when either button held
    if (this.input.isMouseButtonDown(0) || this.input.isMouseButtonDown(2)) {
      const delta = this.input.getMouseDelta();
      this.yaw -= delta.x * ROTATION_SENSITIVITY;
      this.pitch = Math.max(-Math.PI / 4, Math.min(Math.PI / 2, this.pitch + delta.y * ROTATION_SENSITIVITY));
    }
    this.input.resetMouseDelta();

    // Gamepad right stick: camera rotation or zoom
    const rightStick = this.input.getGamepadRightStick();
    if (rightStick.x !== 0 || rightStick.y !== 0) {
      if (this.input.isGamepadButtonDown(GAMEPAD_ZOOM_MODIFIER_BUTTON)) {
        // LB held: right stick Y = zoom
        this.distance = Math.max(5, Math.min(30, this.distance + rightStick.y * GAMEPAD_ZOOM_SPEED * this.dt));
      } else {
        // Normal: right stick = camera rotation
        this.yaw -= rightStick.x * GAMEPAD_ROTATION_SPEED * this.dt;
        this.pitch = Math.max(-Math.PI / 4, Math.min(Math.PI / 2, this.pitch + rightStick.y * GAMEPAD_ROTATION_SPEED * this.dt));
      }
    }

    this.target.set(targetPos.x, targetPos.y + PLAYER_HEIGHT * 0.75, targetPos.z);

    const x = this.target.x + this.distance * Math.sin(this.yaw) * Math.cos(this.pitch);
    const y = Math.max(0.1, this.target.y + this.distance * Math.sin(this.pitch));
    const z = this.target.z + this.distance * Math.cos(this.yaw) * Math.cos(this.pitch);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.target);
  }
}

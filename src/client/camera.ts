import * as THREE from 'three';
import { PLAYER_HEIGHT } from '../shared/types';

export class CameraController {
  readonly camera: THREE.PerspectiveCamera;
  private yaw = 0;
  private pitch = 0.5;
  private distance = 15;
  private isDragging = false;
  private target = new THREE.Vector3();

  get cameraYaw(): number { return this.yaw; }

  constructor(canvas: HTMLCanvasElement) {
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) {
        this.isDragging = true;
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) {
        this.isDragging = false;
      }
    });
    canvas.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.yaw -= e.movementX * 0.003;
      this.pitch = Math.max(-Math.PI / 4, Math.min(Math.PI / 2, this.pitch + e.movementY * 0.003));
    });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.distance = Math.max(5, Math.min(30, this.distance + e.deltaY * 0.01));
    }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  update(targetPos: { x: number; y: number; z: number }): void {
    this.target.set(targetPos.x, targetPos.y + PLAYER_HEIGHT * 0.75, targetPos.z);

    const x = this.target.x + this.distance * Math.sin(this.yaw) * Math.cos(this.pitch);
    const y = Math.max(0.1, this.target.y + this.distance * Math.sin(this.pitch));
    const z = this.target.z + this.distance * Math.cos(this.yaw) * Math.cos(this.pitch);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.target);
  }
}

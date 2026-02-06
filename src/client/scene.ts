import * as THREE from 'three';
import { type CharacterMesh, MODEL_CLASSES, MODEL_NAMES } from './models.js';
import { ARENA_SIZE } from '../shared/types.js';

export class SceneManager {
  readonly scene: THREE.Scene;
  readonly renderer: THREE.WebGLRenderer;
  private playerMeshes = new Map<string, CharacterMesh>();
  private modelIndex = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(10, 20, 10);
    this.scene.add(ambient, directional);

    // Arena floor
    const floorGeo = new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE);
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(ARENA_SIZE / 2, 0, ARENA_SIZE / 2);
    this.scene.add(floor);

    // Grid overlay
    const grid = new THREE.GridHelper(ARENA_SIZE, ARENA_SIZE, 0x666666, 0x666666);
    grid.position.set(ARENA_SIZE / 2, 0.01, ARENA_SIZE / 2);
    this.scene.add(grid);

    // Model selector UI
    this.createModelSelector();
  }

  private createModelSelector(): void {
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:12px;font-family:monospace;color:#fff;text-shadow:1px 1px 2px #000;z-index:100;background:rgba(0,0,0,0.5);padding:10px 16px;border-radius:8px;';
    document.body.appendChild(container);

    const leftBtn = document.createElement('button');
    leftBtn.textContent = '\u25C0';
    leftBtn.style.cssText = 'background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.4);color:#fff;font-size:18px;padding:4px 10px;border-radius:4px;cursor:pointer;';
    leftBtn.addEventListener('click', () => this.cycleModel(-1));

    const label = document.createElement('span');
    label.style.cssText = 'font-size:14px;min-width:120px;text-align:center;';
    label.textContent = `Model: ${MODEL_NAMES[this.modelIndex]}`;

    const rightBtn = document.createElement('button');
    rightBtn.textContent = '\u25B6';
    rightBtn.style.cssText = leftBtn.style.cssText;
    rightBtn.addEventListener('click', () => this.cycleModel(1));

    container.appendChild(leftBtn);
    container.appendChild(label);
    container.appendChild(rightBtn);

    this.selectorLabel = label;

    // Keyboard shortcuts: [ and ] to cycle models
    window.addEventListener('keydown', (e) => {
      if (e.key === '[') this.cycleModel(-1);
      if (e.key === ']') this.cycleModel(1);
    });
  }

  private selectorLabel: HTMLSpanElement | null = null;

  private cycleModel(direction: number): void {
    this.modelIndex = (this.modelIndex + direction + MODEL_CLASSES.length) % MODEL_CLASSES.length;
    if (this.selectorLabel) {
      this.selectorLabel.textContent = `Model: ${MODEL_NAMES[this.modelIndex]}`;
    }
    // Rebuild all player meshes with the new model
    for (const [id, oldMesh] of this.playerMeshes) {
      const pos = oldMesh.position.clone();
      const rotY = oldMesh.rotation.y;
      const color = (oldMesh.children[0] as THREE.Mesh & { material: THREE.MeshLambertMaterial }).material.color.getHex();
      this.scene.remove(oldMesh);
      const ModelClass = MODEL_CLASSES[this.modelIndex];
      const newMesh = new ModelClass(color);
      newMesh.position.copy(pos);
      newMesh.rotation.y = rotY;
      this.playerMeshes.set(id, newMesh);
      this.scene.add(newMesh);
    }
  }

  getOrCreatePlayer(id: string, color: number): CharacterMesh {
    if (!this.playerMeshes.has(id)) {
      const ModelClass = MODEL_CLASSES[this.modelIndex];
      const mesh = new ModelClass(color);
      this.playerMeshes.set(id, mesh);
      this.scene.add(mesh);
    }
    return this.playerMeshes.get(id)!;
  }

  removePlayer(id: string): void {
    const mesh = this.playerMeshes.get(id);
    if (mesh) {
      this.scene.remove(mesh);
      this.playerMeshes.delete(id);
    }
  }

  getTrackedIds(): string[] {
    return [...this.playerMeshes.keys()];
  }

  render(camera: THREE.Camera): void {
    this.renderer.render(this.scene, camera);
  }
}

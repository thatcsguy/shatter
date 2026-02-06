import * as THREE from 'three';
import { CharacterMesh } from './models.js';
import { ARENA_SIZE } from '../shared/types.js';

export class SceneManager {
  readonly scene: THREE.Scene;
  readonly renderer: THREE.WebGLRenderer;
  private playerMeshes = new Map<string, CharacterMesh>();

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
  }

  getOrCreatePlayer(id: string, color: number): CharacterMesh {
    if (!this.playerMeshes.has(id)) {
      const mesh = new CharacterMesh(color);
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

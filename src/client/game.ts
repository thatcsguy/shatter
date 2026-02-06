import { InputManager } from './input.js';
import { NetworkManager } from './network.js';
import { CameraController } from './camera.js';
import { SceneManager } from './scene.js';
import { HUD } from './hud.js';

export class ClientGame {
  private input: InputManager;
  private network: NetworkManager;
  private camera: CameraController;
  private sceneManager: SceneManager;
  private hud: HUD;
  private lastTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.input = new InputManager(canvas);
    this.network = new NetworkManager();
    this.camera = new CameraController(canvas, this.input);
    this.sceneManager = new SceneManager(canvas);
    this.hud = new HUD();
  }

  start(): void {
    this.network.connect();
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  private loop(time: number): void {
    const dt = Math.min((time - this.lastTime) / 1000, 0.05); // Cap at 50ms
    this.lastTime = time;

    // Sample and send input
    const localState = this.network.localState;
    if (localState) {
      const input = this.input.sample(dt, this.camera.cameraYaw);
      this.network.sendInput(input);

      // Update local player mesh
      const localId = this.network.localId!;
      const localColor = this.network.getPlayerColor(localId);
      const mesh = this.sceneManager.getOrCreatePlayer(localId, localColor);
      mesh.position.set(localState.position.x, localState.position.y, localState.position.z);
      mesh.animate(localState.velocity, dt);

      // Update camera
      this.camera.update(localState.position);
    }

    // Update other players via interpolation
    const otherIds = this.network.getOtherPlayerIds();
    for (const id of otherIds) {
      const state = this.network.getInterpolatedState(id);
      if (state) {
        const mesh = this.sceneManager.getOrCreatePlayer(id, state.color);
        mesh.position.set(state.position.x, state.position.y, state.position.z);
        mesh.animate(state.velocity ?? { x: 0, z: 0 }, dt);
      }
    }

    // Clean up disconnected players
    for (const id of this.sceneManager.getTrackedIds()) {
      if (id !== this.network.localId && !otherIds.includes(id)) {
        this.sceneManager.removePlayer(id);
      }
    }

    // Update HUD
    const firstOtherId = otherIds[0];
    this.hud.update({
      playerCount: this.network.playerCount,
      ping: this.network.ping,
      pendingInputs: this.network.pendingCount,
      bufferSize: firstOtherId ? this.network.getBufferSize(firstOtherId) : 0,
    });

    // Render
    this.sceneManager.render(this.camera.camera);

    requestAnimationFrame((t) => this.loop(t));
  }
}

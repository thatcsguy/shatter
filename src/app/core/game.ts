import { Vector3 } from "three";
import type { GameLoopStats } from "@app/core/gameLoop";
import { GameLoop } from "@app/core/gameLoop";
import { DebugControls } from "@app/debug/debugControls";
import { DebugOverlay } from "@app/debug/debugOverlay";
import { KeyboardController } from "@app/input/keyboard";
import { ARENA_BOUNDS } from "@config/arena";
import { createArena } from "@app/rendering/arenaScene";
import type { RenderContext } from "@app/rendering/createRenderContext";
import { createRenderContext, resizeRenderer } from "@app/rendering/createRenderContext";
import { PlayerToken } from "@app/rendering/playerToken";

const PLAYER_MAX_SPEED = 6;
const PLAYER_ACCELERATION = 24;
const PLAYER_FRICTION = 18;
const VELOCITY_EPSILON = 0.01;

export interface GameStatsListener {
  (stats: { fps: number; rawDelta: number }): void;
}

export class ShatterGame {
  private readonly ctx: RenderContext;
  private readonly loop: GameLoop;
  private readonly keyboard = new KeyboardController();
  private readonly player: PlayerToken;
  private readonly velocity = new Vector3();
  private readonly direction = new Vector3();
  private readonly targetVelocity = new Vector3();
  private readonly stepVector = new Vector3();
  private readonly playerPosition = new Vector3();
  private readonly origin = new Vector3(0, 0, 0);
  private readonly overlay: DebugOverlay;
  private readonly debugControls: DebugControls;
  private statsListener: GameStatsListener | null = null;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly host: HTMLElement) {
    this.ctx = createRenderContext(canvas);
    this.player = new PlayerToken();
    this.ctx.scene.add(createArena());
    this.ctx.scene.add(this.player.mesh);

    this.loop = new GameLoop(this.update);
    this.loop.setStatsListener(this.handleLoopStats);

    this.overlay = new DebugOverlay(host);
    this.overlay.setVisible(false);

    this.debugControls = new DebugControls({
      toggleOverlay: () => this.overlay.toggle(),
      resetPlayer: () => this.resetPlayer()
    });

    window.addEventListener("resize", this.handleResize);
  }

  setStatsListener(listener: GameStatsListener | null) {
    this.statsListener = listener;
  }

  start() {
    this.loop.start();
  }

  dispose() {
    this.loop.stop();
    this.keyboard.dispose();
    this.debugControls.dispose();
    this.overlay.dispose();
    window.removeEventListener("resize", this.handleResize);
  }

  private readonly handleResize = () => {
    resizeRenderer(this.ctx.renderer, this.ctx.camera, this.ctx.viewport);
  };

  private readonly handleLoopStats = (stats: GameLoopStats) => {
    this.overlay.update({
      fps: stats.fps,
      deltaMs: stats.rawDelta * 1000,
      position: { x: this.playerPosition.x, z: this.playerPosition.z },
      speed: this.velocity.length()
    });

    if (this.statsListener) {
      this.statsListener({ fps: stats.fps, rawDelta: stats.rawDelta });
    }
  };

  private readonly update = (deltaTime: number) => {
    if (deltaTime === 0) return;

    const input = this.keyboard.snapshot();
    this.direction.set(
      (input.right ? 1 : 0) - (input.left ? 1 : 0),
      0,
      (input.down ? 1 : 0) - (input.up ? 1 : 0)
    );

    if (this.direction.lengthSq() > 0) {
      this.direction.normalize();
      this.targetVelocity.copy(this.direction).multiplyScalar(PLAYER_MAX_SPEED);
      const lerpFactor = 1 - Math.exp(-PLAYER_ACCELERATION * deltaTime);
      this.velocity.lerp(this.targetVelocity, lerpFactor);
    } else {
      const damping = Math.exp(-PLAYER_FRICTION * deltaTime);
      this.velocity.multiplyScalar(damping);
      if (this.velocity.lengthSq() < VELOCITY_EPSILON * VELOCITY_EPSILON) {
        this.velocity.set(0, 0, 0);
      }
    }

    this.stepVector.copy(this.velocity).multiplyScalar(deltaTime);
    if (this.stepVector.lengthSq() > 0) {
      this.player.move(this.stepVector);
    }

    this.player.getPosition(this.playerPosition);
    this.enforceArenaBounds();
    this.ctx.renderer.render(this.ctx.scene, this.ctx.camera);
  };

  private enforceArenaBounds() {
    const { minX, maxX, minZ, maxZ } = ARENA_BOUNDS;
    let clamped = false;

    if (this.playerPosition.x < minX) {
      this.playerPosition.x = minX;
      this.velocity.x = Math.max(this.velocity.x, 0);
      clamped = true;
    } else if (this.playerPosition.x > maxX) {
      this.playerPosition.x = maxX;
      this.velocity.x = Math.min(this.velocity.x, 0);
      clamped = true;
    }

    if (this.playerPosition.z < minZ) {
      this.playerPosition.z = minZ;
      this.velocity.z = Math.max(this.velocity.z, 0);
      clamped = true;
    } else if (this.playerPosition.z > maxZ) {
      this.playerPosition.z = maxZ;
      this.velocity.z = Math.min(this.velocity.z, 0);
      clamped = true;
    }

    if (clamped) {
      this.player.teleport(this.playerPosition);
    }
  }

  private resetPlayer() {
    this.velocity.set(0, 0, 0);
    this.player.teleport(this.origin);
    this.player.getPosition(this.playerPosition);
    this.enforceArenaBounds();
  }
}


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
import type { Entity } from "@app/entities/entity";
import { EntityWorld } from "@app/entities/world";
import type { MotionComponent } from "@app/entities/components/motion";
import { MotionComponentType } from "@app/entities/components/motion";
import type { TransformComponent } from "@app/entities/components/transform";
import { TransformComponentType } from "@app/entities/components/transform";
import { MovementSystem } from "@app/entities/systems/movementSystem";
import { TelegraphSystem } from "@app/entities/systems/telegraphSystem";
import { CollisionSystem } from "@app/entities/systems/collisionSystem";
import { PlayerBlueprint } from "@app/entities/examples/entityShowcase";

export interface GameStatsListener {
  (stats: { fps: number; rawDelta: number }): void;
}

export class ShatterGame {
  private readonly ctx: RenderContext;
  private readonly loop: GameLoop;
  private readonly keyboard = new KeyboardController();
  private readonly player: PlayerToken;
  private readonly direction = new Vector3();
  private readonly playerPosition = new Vector3();
  private readonly origin = new Vector3(0, 0, 0);
  private readonly overlay: DebugOverlay;
  private readonly debugControls: DebugControls;
  private readonly world = new EntityWorld();
  private readonly playerEntity: Entity;
  private readonly playerTransform: TransformComponent;
  private readonly playerMotion: MotionComponent;
  private statsListener: GameStatsListener | null = null;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly host: HTMLElement) {
    this.ctx = createRenderContext(canvas);
    this.player = new PlayerToken();
    this.ctx.scene.add(createArena());
    this.ctx.scene.add(this.player.mesh);

    this.world.addSystem(new MovementSystem());
    this.world.addSystem(new TelegraphSystem());
    this.world.addSystem(new CollisionSystem());

    this.playerEntity = this.world.spawn(PlayerBlueprint);
    this.playerTransform = this.playerEntity.get(TransformComponentType);
    this.playerMotion = this.playerEntity.get(MotionComponentType);
    this.player.teleport(this.playerTransform.position);
    this.playerPosition.copy(this.playerTransform.position);

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
      speed: this.playerMotion.velocity.length()
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
      this.playerMotion.targetVelocity.copy(this.direction).multiplyScalar(this.playerMotion.maxSpeed);
    } else {
      this.playerMotion.targetVelocity.set(0, 0, 0);
    }

    this.world.update(deltaTime);

    this.playerPosition.copy(this.playerTransform.position);
    this.enforceArenaBounds();
    this.player.teleport(this.playerPosition);

    this.ctx.renderer.render(this.ctx.scene, this.ctx.camera);
  };

  private enforceArenaBounds() {
    const { minX, maxX, minZ, maxZ } = ARENA_BOUNDS;
    let clamped = false;

    if (this.playerPosition.x < minX) {
      this.playerPosition.x = minX;
      if (this.playerMotion.velocity.x < 0) this.playerMotion.velocity.x = 0;
      clamped = true;
    } else if (this.playerPosition.x > maxX) {
      this.playerPosition.x = maxX;
      if (this.playerMotion.velocity.x > 0) this.playerMotion.velocity.x = 0;
      clamped = true;
    }

    if (this.playerPosition.z < minZ) {
      this.playerPosition.z = minZ;
      if (this.playerMotion.velocity.z < 0) this.playerMotion.velocity.z = 0;
      clamped = true;
    } else if (this.playerPosition.z > maxZ) {
      this.playerPosition.z = maxZ;
      if (this.playerMotion.velocity.z > 0) this.playerMotion.velocity.z = 0;
      clamped = true;
    }

    if (clamped) {
      this.playerTransform.position.copy(this.playerPosition);
    }
  }

  private resetPlayer() {
    this.playerMotion.velocity.set(0, 0, 0);
    this.playerMotion.targetVelocity.set(0, 0, 0);
    this.playerTransform.position.copy(this.origin);
    this.playerPosition.copy(this.origin);
    this.player.teleport(this.origin);
    this.enforceArenaBounds();
  }
}

import { Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from "three";
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
import { TrainingDummy } from "@app/rendering/trainingDummy";
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
import { Marksman } from "@app/core/marksman";

interface ProjectileInstance {
  mesh: Mesh;
  position: Vector3;
  velocity: Vector3;
  lifetime: number;
}

export interface GameStatsListener {
  (stats: { fps: number; rawDelta: number }): void;
}

export class ShatterGame {
  private readonly ctx: RenderContext;
  private readonly loop: GameLoop;
  private readonly keyboard = new KeyboardController();
  private readonly player: PlayerToken;
  private readonly dummy: TrainingDummy;
  private readonly marksman = new Marksman();
  private readonly direction = new Vector3();
  private readonly playerPosition = new Vector3();
  private readonly spawnPosition = new Vector3(-5, 0, 0);
  private readonly dummyPosition = new Vector3(0, 0, 0);
  private readonly projectileGeometry = new SphereGeometry(0.14, 12, 12);
  private readonly projectileMaterial = new MeshBasicMaterial({ color: 0xfef08a });
  private readonly projectileScratch = new Vector3();
  private readonly projectiles: ProjectileInstance[] = [];
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
    this.dummy = new TrainingDummy();
    this.ctx.scene.add(createArena());
    this.ctx.scene.add(this.dummy.mesh);
    this.ctx.scene.add(this.player.mesh);

    this.dummy.teleport(this.dummyPosition);

    this.world.addSystem(new MovementSystem());
    this.world.addSystem(new TelegraphSystem());
    this.world.addSystem(new CollisionSystem());

    this.playerEntity = this.world.spawn(PlayerBlueprint);
    this.playerTransform = this.playerEntity.get(TransformComponentType);
    this.playerMotion = this.playerEntity.get(MotionComponentType);
    this.playerTransform.position.copy(this.spawnPosition);
    this.player.teleport(this.spawnPosition);
    this.playerPosition.copy(this.spawnPosition);

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
    this.clearProjectiles();
    this.ctx.scene.remove(this.dummy.mesh);
    this.projectileGeometry.dispose();
    this.projectileMaterial.dispose();
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

    if (input.ability1) {
      this.marksman.tryFire({
        playerPosition: this.playerPosition,
        enemyPosition: this.dummyPosition,
        spawnProjectile: this.spawnProjectile
      });
    }

    this.updateProjectiles(deltaTime);

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
    this.playerTransform.position.copy(this.spawnPosition);
    this.playerPosition.copy(this.spawnPosition);
    this.player.teleport(this.spawnPosition);
    this.clearProjectiles();
    this.enforceArenaBounds();
  }

  private readonly spawnProjectile = (origin: Vector3, velocity: Vector3) => {
    const mesh = new Mesh(this.projectileGeometry, this.projectileMaterial);
    const position = new Vector3(origin.x, 0.25, origin.z);
    const direction = new Vector3().copy(velocity);
    direction.y = 0;
    mesh.position.set(position.x, position.y, position.z);
    this.ctx.scene.add(mesh);
    this.projectiles.push({ mesh, position, velocity: direction, lifetime: 2 });
  };

  private updateProjectiles(deltaTime: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = this.projectiles[i];
      projectile.position.addScaledVector(projectile.velocity, deltaTime);
      projectile.mesh.position.set(projectile.position.x, projectile.position.y, projectile.position.z);
      projectile.lifetime -= deltaTime;
      if (projectile.lifetime <= 0) {
        this.removeProjectile(i);
        continue;
      }

      this.projectileScratch.copy(projectile.position).sub(this.dummyPosition);
      this.projectileScratch.y = 0;
      if (this.projectileScratch.lengthSq() < 0.35 * 0.35) {
        this.removeProjectile(i);
      }
    }
  }

  private removeProjectile(index: number) {
    const [projectile] = this.projectiles.splice(index, 1);
    this.ctx.scene.remove(projectile.mesh);
  }

  private clearProjectiles() {
    for (const projectile of this.projectiles) {
      this.ctx.scene.remove(projectile.mesh);
    }
    this.projectiles.length = 0;
  }
}

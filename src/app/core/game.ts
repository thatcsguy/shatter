import { Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from "three";
import type { GameLoopStats } from "@app/core/gameLoop";
import { GameLoop } from "@app/core/gameLoop";
import { DebugControls } from "@app/debug/debugControls";
import { DebugOverlay } from "@app/debug/debugOverlay";
import { KeyboardController } from "@app/input/keyboard";
import { ARENA_BOUNDS } from "@config/arena";
import { DEFAULT_ENCOUNTER } from "@config/encounters";
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
import { BlackMage } from "@app/core/classes/blackMage";
import { Arcanist } from "@app/core/classes/arcanist";
import { Marksman } from "@app/core/classes/marksman";
import type {
  PlayerClass,
  PlayerClassContext,
  ProjectileRuntimeState,
  ProjectileSpawnOptions
} from "@app/core/classes/playerClass";
import { AbilityHud } from "@app/core/abilityHud";
import type { AbilityHudState } from "@app/core/abilityHud";
import { DamageEngine, type DamageInstance, type DamageResult, type DamageSourceParams } from "@app/core/damage";
import { DamageTracker } from "@app/core/damageTracker";
import { DamageNumberManager } from "@app/rendering/damageNumbers";

interface ProjectileInstance extends ProjectileRuntimeState {
  lifetime: number;
  material?: MeshBasicMaterial;
  damage?: DamageInstance;
  onUpdate?: (projectile: ProjectileRuntimeState, deltaTime: number) => void;
}

type ClassId = "marksman" | "blackMage" | "arcanist";

// Allow a small amount of residual velocity while still counting the player as idle for casting.
const PLAYER_MOVEMENT_IDLE_THRESHOLD_SQ = 0.1 * 0.1;

const CLASS_OPTIONS: { id: ClassId; label: string }[] = [
  { id: "marksman", label: "Marksman" },
  { id: "blackMage", label: "Black Mage" },
  { id: "arcanist", label: "Arcanist" }
];

export interface GameStatsListener {
  (stats: { fps: number; rawDelta: number }): void;
}

export class ShatterGame {
  private readonly ctx: RenderContext;
  private readonly loop: GameLoop;
  private readonly keyboard = new KeyboardController();
  private readonly encounter = DEFAULT_ENCOUNTER;
  private readonly player: PlayerToken;
  private readonly boss = this.encounter.boss.create();
  private readonly classFactories: Record<ClassId, () => PlayerClass> = {
    marksman: () => new Marksman(),
    blackMage: () => new BlackMage(),
    arcanist: () => new Arcanist()
  };
  private readonly direction = new Vector3();
  private readonly playerPosition = new Vector3();
  private readonly spawnPosition = new Vector3(-5, 0, 0);
  private readonly bossPosition = new Vector3();
  private readonly projectileGeometry = new SphereGeometry(0.14, 12, 12);
  private readonly projectileMaterial = new MeshBasicMaterial({ color: 0xfef08a });
  private readonly projectileScratch = new Vector3();
  private readonly projectiles: ProjectileInstance[] = [];
  private readonly overlay: DebugOverlay;
  private readonly debugControls: DebugControls;
  private readonly abilityHud: AbilityHud;
  private readonly world = new EntityWorld();
  private readonly playerEntity: Entity;
  private readonly playerTransform: TransformComponent;
  private readonly playerMotion: MotionComponent;
  private currentClassId: ClassId = "marksman";
  private playerClass: PlayerClass;
  private classContext!: PlayerClassContext;
  private statsListener: GameStatsListener | null = null;
  private readonly damageEngine = new DamageEngine();
  private readonly damageTracker = new DamageTracker();
  private readonly damageNumbers: DamageNumberManager;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly host: HTMLElement) {
    this.ctx = createRenderContext(canvas);
    this.player = new PlayerToken();

    const bossConfig = this.encounter.boss;
    this.ctx.scene.add(createArena());
    this.ctx.scene.add(this.boss.mesh);
    this.ctx.scene.add(this.player.mesh);

    this.damageNumbers = new DamageNumberManager(this.host, this.ctx.camera, this.ctx.viewport);

    this.bossPosition.copy(bossConfig.initialPosition);
    this.boss.teleport(this.bossPosition);

    this.world.addSystem(new MovementSystem());
    this.world.addSystem(new TelegraphSystem());
    this.world.addSystem(new CollisionSystem());

    this.playerEntity = this.world.spawn(PlayerBlueprint);
    this.playerTransform = this.playerEntity.get(TransformComponentType);
    this.playerMotion = this.playerEntity.get(MotionComponentType);
    this.playerTransform.position.copy(this.spawnPosition);
    this.player.teleport(this.spawnPosition);
    this.playerPosition.copy(this.spawnPosition);

    this.playerClass = this.createClass(this.currentClassId);
    this.classContext = {
      playerPosition: this.playerPosition,
      enemyPosition: this.bossPosition,
      isPlayerMoving: false,
      spawnProjectile: this.spawnProjectile,
      setCastProgress: (progress) => this.player.setCastProgress(progress),
      createDamageInstance: this.createDamageInstance,
      dealDamage: this.dealDamageToBoss
    };

    this.loop = new GameLoop(this.update);
    this.loop.setStatsListener(this.handleLoopStats);

    this.overlay = new DebugOverlay(host);
    this.overlay.setVisible(false);

    this.overlay.setClassOptions({
      options: CLASS_OPTIONS,
      current: this.currentClassId,
      onSelect: this.handleClassSelected
    });

    this.overlay.setDamageTrackerControls({
      onReset: this.resetDamageTracking
    });
    this.overlay.updateDamageTracker(this.damageTracker.getState());

    this.debugControls = new DebugControls({
      toggleOverlay: () => this.overlay.toggle(),
      resetPlayer: () => this.resetPlayer()
    });

    this.abilityHud = new AbilityHud(host, this.getAbilityHudState());

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
    this.abilityHud.dispose();
    this.player.setCastProgress(null);
    this.clearProjectiles();
    this.damageNumbers.dispose();
    this.ctx.scene.remove(this.boss.mesh);
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

    this.classContext.isPlayerMoving =
      this.playerMotion.velocity.lengthSq() > PLAYER_MOVEMENT_IDLE_THRESHOLD_SQ;
    this.playerClass.update(deltaTime, this.classContext);

    const abilityInputs = [input.ability1, input.ability2, input.ability3, input.ability4];
    abilityInputs.forEach((pressed, index) => {
      if (!pressed) return;

      this.playerClass.tryUseAbility(index, this.classContext);
    });

    this.abilityHud.update(this.getAbilityHudState());

    this.updateProjectiles(deltaTime);

    this.damageTracker.update(deltaTime);
    this.overlay.updateDamageTracker(this.damageTracker.getState());
    this.damageNumbers.update(deltaTime);

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
    const previousMovement = this.classContext.isPlayerMoving;
    this.classContext.isPlayerMoving = true;
    this.playerClass.update(0, this.classContext);
    this.classContext.isPlayerMoving = previousMovement;
    this.player.setCastProgress(null);
    this.clearProjectiles();
    this.enforceArenaBounds();
  }

  private readonly spawnProjectile = (
    origin: Vector3,
    velocity: Vector3,
    options?: ProjectileSpawnOptions
  ) => {
    const material = options?.color
      ? new MeshBasicMaterial({ color: options.color })
      : this.projectileMaterial;
    const mesh = new Mesh(this.projectileGeometry, material);
    const position = new Vector3(origin.x, 0.25, origin.z);
    const displayPosition = position.clone();
    const direction = new Vector3().copy(velocity);
    direction.y = 0;
    mesh.position.set(displayPosition.x, displayPosition.y, displayPosition.z);
    mesh.scale.setScalar(options?.scale ?? 1);
    this.ctx.scene.add(mesh);
    this.projectiles.push({
      mesh,
      position,
      displayPosition,
      velocity: direction,
      lifetime: options?.lifetime ?? 2,
      age: 0,
      material: options?.color ? material : undefined,
      damage: options?.damage,
      onUpdate: options?.onUpdate
    });
  };

  private getAbilityHudState(): AbilityHudState {
    return {
      abilities: this.playerClass.getAbilityStatuses(),
      gauge: this.playerClass.getGaugeState()
    };
  }

  private updateProjectiles(deltaTime: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = this.projectiles[i];
      projectile.age += deltaTime;
      projectile.position.addScaledVector(projectile.velocity, deltaTime);
      projectile.displayPosition.copy(projectile.position);
      if (projectile.onUpdate) {
        projectile.onUpdate(projectile, deltaTime);
      }
      projectile.mesh.position.set(
        projectile.displayPosition.x,
        projectile.displayPosition.y,
        projectile.displayPosition.z
      );
      projectile.lifetime -= deltaTime;
      if (projectile.lifetime <= 0) {
        this.removeProjectile(i);
        continue;
      }

      this.projectileScratch.copy(projectile.displayPosition).sub(this.bossPosition);
      this.projectileScratch.y = 0;
      if (this.projectileScratch.lengthSq() < 0.35 * 0.35) {
        if (projectile.damage) {
          this.dealDamageToBoss(projectile.damage);
        }
        this.removeProjectile(i);
      }
    }
  }

  private createClass(id: ClassId): PlayerClass {
    const factory = this.classFactories[id];
    return factory();
  }

  private readonly handleClassSelected = (id: ClassId) => {
    if (this.currentClassId === id) {
      return;
    }

    this.currentClassId = id;
    this.playerClass = this.createClass(id);
    this.classContext.isPlayerMoving = false;
    this.player.setCastProgress(null);
    this.overlay.setCurrentClass(id);
    this.abilityHud.update(this.getAbilityHudState());
  };

  private removeProjectile(index: number) {
    const [projectile] = this.projectiles.splice(index, 1);
    this.ctx.scene.remove(projectile.mesh);
    projectile.material?.dispose();
  }

  private clearProjectiles() {
    for (const projectile of this.projectiles) {
      this.ctx.scene.remove(projectile.mesh);
      projectile.material?.dispose();
    }
    this.projectiles.length = 0;
  }

  private readonly createDamageInstance = (params: DamageSourceParams) => {
    return this.damageEngine.createInstance(params);
  };

  private readonly dealDamageToBoss = (instance: DamageInstance): DamageResult => {
    const alreadyResolved = instance.resolved;
    const result = this.damageEngine.resolve(instance);
    if (!alreadyResolved) {
      this.damageTracker.record(result.amount);
      this.damageNumbers.spawn(result.amount, this.bossPosition);
    }
    return result;
  };

  private readonly resetDamageTracking = () => {
    this.damageTracker.reset();
    this.overlay.updateDamageTracker(this.damageTracker.getState());
    this.damageNumbers.clear();
  };
}

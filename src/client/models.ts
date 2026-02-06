import * as THREE from 'three';

// Shared animate logic: limb swing + facing rotation
function animateCharacter(
  group: THREE.Group,
  limbs: { leftArm: THREE.Group; rightArm: THREE.Group; leftLeg: THREE.Group; rightLeg: THREE.Group },
  phase: { value: number },
  velocity: { x: number; z: number },
  dt: number,
  movementDirection?: { x: number; z: number },
): void {
  const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);

  if (speed > 0.5) {
    phase.value += dt * speed * 2;
    const swing = Math.sin(phase.value) * 0.5;
    limbs.leftArm.rotation.x = swing;
    limbs.rightArm.rotation.x = -swing;
    limbs.leftLeg.rotation.x = -swing;
    limbs.rightLeg.rotation.x = swing;
  } else {
    phase.value = 0;
    limbs.leftArm.rotation.x *= 0.9;
    limbs.rightArm.rotation.x *= 0.9;
    limbs.leftLeg.rotation.x *= 0.9;
    limbs.rightLeg.rotation.x *= 0.9;
  }

  const facing = movementDirection ?? velocity;
  const facingSpeed = Math.sqrt(facing.x * facing.x + facing.z * facing.z);
  if (facingSpeed > 0.01) {
    const targetAngle = Math.atan2(facing.x, facing.z);
    const diff = targetAngle - group.rotation.y;
    const wrapped = Math.atan2(Math.sin(diff), Math.cos(diff));
    const maxStep = 10 * dt;
    if (Math.abs(wrapped) <= maxStep) {
      group.rotation.y = targetAngle;
    } else {
      group.rotation.y += Math.sign(wrapped) * maxStep;
    }
  }
}

// Helper: add a simple face to a head
function addFace(parent: THREE.Group, headY: number, headRadius: number): void {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(20, 24, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(44, 24, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(32, 40, 10, 0, Math.PI); ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshLambertMaterial({ map: texture, transparent: true });
  const size = headRadius * 1.3;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  face.position.set(0, headY, headRadius + 0.01);
  parent.add(face);
}

// Helper: create a limb pivot group at a joint position with a limb mesh offset inside
function makeLimbPivot(
  jointPos: THREE.Vector3,
  limbGeo: THREE.BufferGeometry,
  mat: THREE.Material,
  limbOffset: number,
): THREE.Group {
  const pivot = new THREE.Group();
  pivot.position.copy(jointPos);
  const limb = new THREE.Mesh(limbGeo, mat);
  limb.position.y = -limbOffset;
  pivot.add(limb);
  return pivot;
}

// ─── Model 1: Blob ─── Rounded bean-shaped body, stubby limbs
export class BlobMesh extends THREE.Group {
  private leftArmPivot: THREE.Group;
  private rightArmPivot: THREE.Group;
  private leftLegPivot: THREE.Group;
  private rightLegPivot: THREE.Group;
  private animPhase = { value: 0 };

  constructor(color: number) {
    super();
    const mat = new THREE.MeshLambertMaterial({ color });

    // Body: squished sphere (wide, short)
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), mat);
    body.scale.set(1, 1.4, 0.9);
    body.position.y = 1.0;
    this.add(body);

    // Head: small sphere sitting on top
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), mat);
    head.position.y = 1.85;
    this.add(head);
    addFace(this, 1.85, 0.3);

    // Arms: short stubby cylinders, pivoting from shoulders
    const armGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.5, 8);
    this.leftArmPivot = makeLimbPivot(new THREE.Vector3(-0.5, 1.45, 0), armGeo, mat, 0.25);
    this.rightArmPivot = makeLimbPivot(new THREE.Vector3(0.5, 1.45, 0), armGeo, mat, 0.25);
    this.add(this.leftArmPivot, this.rightArmPivot);

    // Legs: short stubby cylinders, pivoting from hips
    const legGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.5, 8);
    this.leftLegPivot = makeLimbPivot(new THREE.Vector3(-0.2, 0.35, 0), legGeo, mat, 0.25);
    this.rightLegPivot = makeLimbPivot(new THREE.Vector3(0.2, 0.35, 0), legGeo, mat, 0.25);
    this.add(this.leftLegPivot, this.rightLegPivot);
  }

  animate(velocity: { x: number; z: number }, dt: number, movementDirection?: { x: number; z: number }): void {
    animateCharacter(this, {
      leftArm: this.leftArmPivot, rightArm: this.rightArmPivot,
      leftLeg: this.leftLegPivot, rightLeg: this.rightLegPivot,
    }, this.animPhase, velocity, dt, movementDirection);
  }
}

// ─── Model 2: Capsule ─── Tall pill-shaped body, lanky proportions
export class CapsuleMesh extends THREE.Group {
  private leftArmPivot: THREE.Group;
  private rightArmPivot: THREE.Group;
  private leftLegPivot: THREE.Group;
  private rightLegPivot: THREE.Group;
  private animPhase = { value: 0 };

  constructor(color: number) {
    super();
    const mat = new THREE.MeshLambertMaterial({ color });

    // Body: capsule shape using lathe geometry
    const points: THREE.Vector2[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const y = t * 1.2;
      // Wider at middle, narrow at ends
      const r = 0.3 * Math.sin(t * Math.PI);
      points.push(new THREE.Vector2(Math.max(r, 0.05), y));
    }
    const bodyGeo = new THREE.LatheGeometry(points, 16);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = 0.5;
    this.add(body);

    // Head: slightly larger sphere
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), mat);
    head.position.y = 1.9;
    this.add(head);
    addFace(this, 1.9, 0.28);

    // Arms: long thin cylinders from shoulders
    const armGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.7, 8);
    this.leftArmPivot = makeLimbPivot(new THREE.Vector3(-0.35, 1.55, 0), armGeo, mat, 0.35);
    this.rightArmPivot = makeLimbPivot(new THREE.Vector3(0.35, 1.55, 0), armGeo, mat, 0.35);
    this.add(this.leftArmPivot, this.rightArmPivot);

    // Legs: long thin cylinders from hips
    const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.55, 8);
    this.leftLegPivot = makeLimbPivot(new THREE.Vector3(-0.15, 0.5, 0), legGeo, mat, 0.275);
    this.rightLegPivot = makeLimbPivot(new THREE.Vector3(0.15, 0.5, 0), legGeo, mat, 0.275);
    this.add(this.leftLegPivot, this.rightLegPivot);
  }

  animate(velocity: { x: number; z: number }, dt: number, movementDirection?: { x: number; z: number }): void {
    animateCharacter(this, {
      leftArm: this.leftArmPivot, rightArm: this.rightArmPivot,
      leftLeg: this.leftLegPivot, rightLeg: this.rightLegPivot,
    }, this.animPhase, velocity, dt, movementDirection);
  }
}

// ─── Model 3: Golem ─── Bulky top-heavy body, thick limbs
export class GolemMesh extends THREE.Group {
  private leftArmPivot: THREE.Group;
  private rightArmPivot: THREE.Group;
  private leftLegPivot: THREE.Group;
  private rightLegPivot: THREE.Group;
  private animPhase = { value: 0 };

  constructor(color: number) {
    super();
    const mat = new THREE.MeshLambertMaterial({ color });

    // Body: wide barrel torso using stacked spheres
    const torsoLower = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), mat);
    torsoLower.scale.set(1, 0.7, 0.8);
    torsoLower.position.y = 0.8;
    this.add(torsoLower);

    const torsoUpper = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), mat);
    torsoUpper.scale.set(1.1, 0.8, 0.9);
    torsoUpper.position.y = 1.3;
    this.add(torsoUpper);

    // Head: small head on big body
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), mat);
    head.position.y = 1.9;
    this.add(head);
    addFace(this, 1.9, 0.22);

    // Arms: thick and beefy, from wide shoulders
    const armGeo = new THREE.CylinderGeometry(0.14, 0.12, 0.65, 8);
    this.leftArmPivot = makeLimbPivot(new THREE.Vector3(-0.6, 1.5, 0), armGeo, mat, 0.325);
    this.rightArmPivot = makeLimbPivot(new THREE.Vector3(0.6, 1.5, 0), armGeo, mat, 0.325);
    this.add(this.leftArmPivot, this.rightArmPivot);

    // Legs: thick stumpy legs
    const legGeo = new THREE.CylinderGeometry(0.15, 0.13, 0.55, 8);
    this.leftLegPivot = makeLimbPivot(new THREE.Vector3(-0.25, 0.4, 0), legGeo, mat, 0.275);
    this.rightLegPivot = makeLimbPivot(new THREE.Vector3(0.25, 0.4, 0), legGeo, mat, 0.275);
    this.add(this.leftLegPivot, this.rightLegPivot);
  }

  animate(velocity: { x: number; z: number }, dt: number, movementDirection?: { x: number; z: number }): void {
    animateCharacter(this, {
      leftArm: this.leftArmPivot, rightArm: this.rightArmPivot,
      leftLeg: this.leftLegPivot, rightLeg: this.rightLegPivot,
    }, this.animPhase, velocity, dt, movementDirection);
  }
}

// ─── Model 4: Sprout ─── Bottom-heavy teardrop body, tiny arms, leaf antenna
export class SproutMesh extends THREE.Group {
  private leftArmPivot: THREE.Group;
  private rightArmPivot: THREE.Group;
  private leftLegPivot: THREE.Group;
  private rightLegPivot: THREE.Group;
  private animPhase = { value: 0 };

  constructor(color: number) {
    super();
    const mat = new THREE.MeshLambertMaterial({ color });

    // Body: teardrop / pear shape using lathe
    const points: THREE.Vector2[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const y = t * 1.4;
      // Wide at bottom, narrow at top
      const r = 0.45 * (1 - t * 0.6) * Math.sin(t * Math.PI * 0.85 + 0.2);
      points.push(new THREE.Vector2(Math.max(r, 0.04), y));
    }
    const bodyGeo = new THREE.LatheGeometry(points, 16);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = 0.35;
    this.add(body);

    // Head: merged with body top, small bump
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), mat);
    head.position.y = 1.85;
    this.add(head);
    addFace(this, 1.85, 0.25);

    // Leaf antenna on top
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x44aa44 });
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), leafMat);
    leaf.scale.set(1, 0.4, 2);
    leaf.position.set(0, 2.15, 0.05);
    this.add(leaf);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.15, 4), leafMat);
    stem.position.set(0, 2.05, 0);
    this.add(stem);

    // Arms: tiny stubs from body
    const armGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.35, 8);
    this.leftArmPivot = makeLimbPivot(new THREE.Vector3(-0.4, 1.4, 0), armGeo, mat, 0.175);
    this.rightArmPivot = makeLimbPivot(new THREE.Vector3(0.4, 1.4, 0), armGeo, mat, 0.175);
    this.add(this.leftArmPivot, this.rightArmPivot);

    // Legs: short and rounded
    const legGeo = new THREE.CylinderGeometry(0.11, 0.09, 0.4, 8);
    this.leftLegPivot = makeLimbPivot(new THREE.Vector3(-0.18, 0.35, 0), legGeo, mat, 0.2);
    this.rightLegPivot = makeLimbPivot(new THREE.Vector3(0.18, 0.35, 0), legGeo, mat, 0.2);
    this.add(this.leftLegPivot, this.rightLegPivot);
  }

  animate(velocity: { x: number; z: number }, dt: number, movementDirection?: { x: number; z: number }): void {
    animateCharacter(this, {
      leftArm: this.leftArmPivot, rightArm: this.rightArmPivot,
      leftLeg: this.leftLegPivot, rightLeg: this.rightLegPivot,
    }, this.animPhase, velocity, dt, movementDirection);
  }
}

// ─── Model 5: Spooky ─── Ghost-like with floating hands and a tail instead of legs
export class SpookyMesh extends THREE.Group {
  private leftArmPivot: THREE.Group;
  private rightArmPivot: THREE.Group;
  private leftLegPivot: THREE.Group;
  private rightLegPivot: THREE.Group;
  private animPhase = { value: 0 };

  constructor(color: number) {
    super();
    const mat = new THREE.MeshLambertMaterial({ color });

    // Body: tall rounded shape that narrows at the bottom, like a ghost
    const points: THREE.Vector2[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const y = t * 1.5;
      // Wide at top, tapers to a wispy tail
      const r = 0.38 * Math.sin(t * Math.PI * 0.7 + 0.5) * (0.5 + 0.5 * t);
      points.push(new THREE.Vector2(Math.max(r, 0.03), y));
    }
    const bodyGeo = new THREE.LatheGeometry(points, 16);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = 0.15;
    this.add(body);

    // Head: slightly larger, sits on body
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16), mat);
    head.position.y = 1.85;
    this.add(head);

    // Spooky face: bigger eyes, wavy mouth
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000';
    // Big oval eyes
    ctx.beginPath(); ctx.ellipse(20, 24, 5, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(44, 24, 5, 7, 0, 0, Math.PI * 2); ctx.fill();
    // Wavy mouth
    ctx.beginPath();
    ctx.moveTo(18, 44);
    ctx.quadraticCurveTo(25, 38, 32, 44);
    ctx.quadraticCurveTo(39, 50, 46, 44);
    ctx.lineWidth = 2;
    ctx.stroke();
    const texture = new THREE.CanvasTexture(canvas);
    const faceMat = new THREE.MeshLambertMaterial({ map: texture, transparent: true });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), faceMat);
    face.position.set(0, 1.85, 0.33);
    this.add(face);

    // Arms: floating ball hands connected by thin cylinders
    const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8);
    this.leftArmPivot = makeLimbPivot(new THREE.Vector3(-0.45, 1.5, 0), armGeo, mat, 0.25);
    this.rightArmPivot = makeLimbPivot(new THREE.Vector3(0.45, 1.5, 0), armGeo, mat, 0.25);
    // Add ball hands
    const handGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const leftHand = new THREE.Mesh(handGeo, mat);
    leftHand.position.y = -0.55;
    this.leftArmPivot.add(leftHand);
    const rightHand = new THREE.Mesh(handGeo, mat);
    rightHand.position.y = -0.55;
    this.rightArmPivot.add(rightHand);
    this.add(this.leftArmPivot, this.rightArmPivot);

    // Legs: wispy tail tendrils instead of real legs
    const tailGeo = new THREE.CylinderGeometry(0.06, 0.02, 0.4, 6);
    this.leftLegPivot = makeLimbPivot(new THREE.Vector3(-0.1, 0.2, 0), tailGeo, mat, 0.2);
    this.rightLegPivot = makeLimbPivot(new THREE.Vector3(0.1, 0.2, 0), tailGeo, mat, 0.2);
    this.add(this.leftLegPivot, this.rightLegPivot);
  }

  animate(velocity: { x: number; z: number }, dt: number, movementDirection?: { x: number; z: number }): void {
    animateCharacter(this, {
      leftArm: this.leftArmPivot, rightArm: this.rightArmPivot,
      leftLeg: this.leftLegPivot, rightLeg: this.rightLegPivot,
    }, this.animPhase, velocity, dt, movementDirection);
  }
}

// ─── Character model type for use in scene/game ───

export type CharacterMesh = BlobMesh | CapsuleMesh | GolemMesh | SproutMesh | SpookyMesh;

export const MODEL_CLASSES = [BlobMesh, CapsuleMesh, GolemMesh, SproutMesh, SpookyMesh] as const;
export const MODEL_NAMES = ['Blob', 'Capsule', 'Golem', 'Sprout', 'Spooky'] as const;

// Keep HumanoidMesh as an alias for backwards compatibility during transition
export { BlobMesh as HumanoidMesh };

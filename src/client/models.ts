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

// Create a rounded box geometry by subdividing a box and rounding corners
function createRoundedBoxGeo(
  width: number, height: number, depth: number, radius: number, segments: number,
): THREE.BoxGeometry {
  const geo = new THREE.BoxGeometry(width, height, depth, segments, segments, segments);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const halfW = width / 2, halfH = height / 2, halfD = depth / 2;

  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i), pos.getY(i), pos.getZ(i));

    // Distance from the inner box boundary along each axis
    const dx = Math.max(0, Math.abs(v.x) - (halfW - radius));
    const dy = Math.max(0, Math.abs(v.y) - (halfH - radius));
    const dz = Math.max(0, Math.abs(v.z) - (halfD - radius));
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (len > 0) {
      const scale = radius / len;
      v.x = Math.sign(v.x) * (Math.min(Math.abs(v.x), halfW - radius) + dx * scale);
      v.y = Math.sign(v.y) * (Math.min(Math.abs(v.y), halfH - radius) + dy * scale);
      v.z = Math.sign(v.z) * (Math.min(Math.abs(v.z), halfD - radius) + dz * scale);
    }

    pos.setXYZ(i, v.x, v.y, v.z);
  }

  geo.computeVertexNormals();
  return geo;
}

// Helper: add a simple smiley face
function addFace(parent: THREE.Group, headY: number, faceSize: number, zOffset: number): void {
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
  const face = new THREE.Mesh(new THREE.PlaneGeometry(faceSize, faceSize), mat);
  face.position.set(0, headY, zOffset);
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

// ─── Character Model ─── Oversized rounded-box head, small torso, stubby limbs
export class CharacterMesh extends THREE.Group {
  private leftArmPivot: THREE.Group;
  private rightArmPivot: THREE.Group;
  private leftLegPivot: THREE.Group;
  private rightLegPivot: THREE.Group;
  private animPhase = { value: 0 };

  constructor(color: number) {
    super();
    const mat = new THREE.MeshLambertMaterial({ color });

    // Head: big rounded box (~half the character height)
    const headGeo = createRoundedBoxGeo(0.9, 0.95, 0.85, 0.15, 6);
    const head = new THREE.Mesh(headGeo, mat);
    head.position.y = 1.42;
    this.add(head);

    // Face on the front of the head
    addFace(this, 1.42, 0.6, 0.85 / 2 + 0.01);

    // Torso: smaller rounded box
    const torsoGeo = createRoundedBoxGeo(0.55, 0.5, 0.45, 0.1, 4);
    const torso = new THREE.Mesh(torsoGeo, mat);
    torso.position.y = 0.7;
    this.add(torso);

    // Arms: short stubby cylinders from torso sides
    const armGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.3, 8);
    this.leftArmPivot = makeLimbPivot(new THREE.Vector3(-0.28, 0.78, 0), armGeo, mat, 0.15);
    this.rightArmPivot = makeLimbPivot(new THREE.Vector3(0.28, 0.78, 0), armGeo, mat, 0.15);
    this.add(this.leftArmPivot, this.rightArmPivot);

    // Legs: short stubby cylinders from torso bottom
    const legGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.4, 8);
    this.leftLegPivot = makeLimbPivot(new THREE.Vector3(-0.14, 0.45, 0), legGeo, mat, 0.2);
    this.rightLegPivot = makeLimbPivot(new THREE.Vector3(0.14, 0.45, 0), legGeo, mat, 0.2);
    this.add(this.leftLegPivot, this.rightLegPivot);
  }

  animate(velocity: { x: number; z: number }, dt: number, movementDirection?: { x: number; z: number }): void {
    animateCharacter(this, {
      leftArm: this.leftArmPivot, rightArm: this.rightArmPivot,
      leftLeg: this.leftLegPivot, rightLeg: this.rightLegPivot,
    }, this.animPhase, velocity, dt, movementDirection);
  }
}

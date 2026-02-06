import * as THREE from 'three';

export class HumanoidMesh extends THREE.Group {
  private leftArm: THREE.Mesh;
  private rightArm: THREE.Mesh;
  private leftLeg: THREE.Mesh;
  private rightLeg: THREE.Mesh;
  private animPhase = 0;

  constructor(color: number) {
    super();

    const mat = new THREE.MeshLambertMaterial({ color });

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), mat);
    head.position.y = 1.85;

    // Face
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = 64;
    faceCanvas.height = 64;
    const ctx = faceCanvas.getContext('2d')!;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(20, 24, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(44, 24, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(32, 40, 10, 0, Math.PI); ctx.stroke();
    const faceTexture = new THREE.CanvasTexture(faceCanvas);
    const faceMat = new THREE.MeshLambertMaterial({ map: faceTexture, transparent: true });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), faceMat);
    face.position.set(0, 1.85, 0.31);
    this.add(face);

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.3), mat);
    torso.position.y = 1.2;

    // Arms
    this.leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.7), mat);
    this.leftArm.position.set(-0.45, 1.2, 0);
    this.rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.7), mat);
    this.rightArm.position.set(0.45, 1.2, 0);

    // Legs
    this.leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8), mat);
    this.leftLeg.position.set(-0.15, 0.4, 0);
    this.rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8), mat);
    this.rightLeg.position.set(0.15, 0.4, 0);

    this.add(head, torso, this.leftArm, this.rightArm, this.leftLeg, this.rightLeg);
  }

  animate(velocity: { x: number; z: number }, dt: number, movementDirection?: { x: number; z: number }): void {
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);

    if (speed > 0.5) {
      this.animPhase += dt * speed * 2;
      const swing = Math.sin(this.animPhase) * 0.5;
      this.leftArm.rotation.x = swing;
      this.rightArm.rotation.x = -swing;
      this.leftLeg.rotation.x = -swing;
      this.rightLeg.rotation.x = swing;
    } else {
      // Return to idle
      this.animPhase = 0;
      this.leftArm.rotation.x *= 0.9;
      this.rightArm.rotation.x *= 0.9;
      this.leftLeg.rotation.x *= 0.9;
      this.rightLeg.rotation.x *= 0.9;
    }

    // Face movement direction (capped rotation speed: 10 rad/s with clean snap)
    // Use movementDirection if provided (allows air rotation), fall back to velocity
    const facing = movementDirection ?? velocity;
    const facingSpeed = Math.sqrt(facing.x * facing.x + facing.z * facing.z);
    if (facingSpeed > 0.01) {
      const targetAngle = Math.atan2(facing.x, facing.z);
      const diff = targetAngle - this.rotation.y;
      const wrapped = Math.atan2(Math.sin(diff), Math.cos(diff));
      const maxStep = 10 * dt;
      if (Math.abs(wrapped) <= maxStep) {
        this.rotation.y = targetAngle;
      } else {
        this.rotation.y += Math.sign(wrapped) * maxStep;
      }
    }
  }
}

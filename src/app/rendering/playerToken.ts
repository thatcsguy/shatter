import {
  CircleGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  Vector3
} from "three";

const CAST_PROGRESS_TOP_ANGLE = Math.PI / 2;
const MIN_CAST_PROGRESS = 0.001;

export class PlayerToken {
  readonly mesh: Group;
  private readonly position = new Vector3();
  private readonly castProgressMesh: Mesh;
  private currentCastProgress: number | null = null;

  constructor() {
    this.mesh = new Group();

    const body = new Mesh(
      new CircleGeometry(0.5, 32),
      new MeshBasicMaterial({ color: 0x38bdf8 })
    );
    body.rotation.x = -Math.PI / 2;
    this.mesh.add(body);

    this.castProgressMesh = new Mesh(
      new RingGeometry(0.58, 0.74, 64, 1, CAST_PROGRESS_TOP_ANGLE - MIN_CAST_PROGRESS, MIN_CAST_PROGRESS),
      new MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.55, side: DoubleSide })
    );
    this.castProgressMesh.rotation.x = -Math.PI / 2;
    this.castProgressMesh.position.y = 0.03;
    this.castProgressMesh.visible = false;
    this.castProgressMesh.renderOrder = 1;
    this.mesh.add(this.castProgressMesh);

    this.mesh.position.set(0, 0.02, 0);
  }

  move(delta: Vector3) {
    this.position.add(delta);
    this.syncMeshPosition();
  }

  teleport(target: Vector3) {
    this.position.copy(target);
    this.syncMeshPosition();
  }

  getPosition(out: Vector3): Vector3 {
    return out.copy(this.position);
  }

  setCastProgress(progress: number | null) {
    if (progress === null) {
      this.currentCastProgress = null;
      this.castProgressMesh.visible = false;
      return;
    }

    const clamped = Math.min(Math.max(progress, 0), 1);

    if (this.currentCastProgress === clamped && this.castProgressMesh.visible) {
      return;
    }

    this.currentCastProgress = clamped;
    this.castProgressMesh.visible = true;

    const thetaLength = Math.max(clamped, MIN_CAST_PROGRESS) * Math.PI * 2;
    const thetaStart = CAST_PROGRESS_TOP_ANGLE - thetaLength;
    const newGeometry = new RingGeometry(0.58, 0.74, 64, 1, thetaStart, thetaLength);
    this.castProgressMesh.geometry.dispose();
    this.castProgressMesh.geometry = newGeometry;
  }

  private syncMeshPosition() {
    this.mesh.position.set(this.position.x, this.mesh.position.y, this.position.z);
  }
}

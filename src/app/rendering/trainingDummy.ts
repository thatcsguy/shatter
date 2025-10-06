import { CylinderGeometry, Group, Mesh, MeshBasicMaterial, Vector3 } from "three";

export class TrainingDummy {
  readonly mesh: Group;
  private readonly position = new Vector3();

  constructor() {
    this.mesh = new Group();

    const body = new Mesh(
      new CylinderGeometry(0.4, 0.4, 1.2, 16),
      new MeshBasicMaterial({ color: 0xf97316 })
    );
    body.position.y = 0.6;
    this.mesh.add(body);

    const head = new Mesh(
      new CylinderGeometry(0.3, 0.3, 0.3, 16),
      new MeshBasicMaterial({ color: 0xfacc15 })
    );
    head.position.y = 1.35;
    this.mesh.add(head);
  }

  teleport(target: Vector3) {
    this.position.copy(target);
    this.syncMeshPosition();
  }

  getPosition(out: Vector3): Vector3 {
    return out.copy(this.position);
  }

  private syncMeshPosition() {
    this.mesh.position.set(this.position.x, 0, this.position.z);
  }
}

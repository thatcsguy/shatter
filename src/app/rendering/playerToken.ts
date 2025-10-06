import { CircleGeometry, Group, Mesh, MeshBasicMaterial, Vector3 } from "three";

export class PlayerToken {
  readonly mesh: Group;
  private readonly position = new Vector3();

  constructor() {
    this.mesh = new Group();

    const body = new Mesh(
      new CircleGeometry(0.5, 32),
      new MeshBasicMaterial({ color: 0x38bdf8 })
    );
    body.rotation.x = -Math.PI / 2;
    this.mesh.add(body);

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

  private syncMeshPosition() {
    this.mesh.position.set(this.position.x, this.mesh.position.y, this.position.z);
  }
}

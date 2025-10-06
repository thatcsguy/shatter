import { ARENA_SIZE } from "@config/arena";
import { GridHelper, Group, Mesh, MeshBasicMaterial, PlaneGeometry } from "three";

export function createArena(): Group {
  const root = new Group();

  const floor = new Mesh(
    new PlaneGeometry(ARENA_SIZE, ARENA_SIZE),
    new MeshBasicMaterial({ color: 0x1e3a8a })
  );
  floor.rotation.x = -Math.PI / 2;
  root.add(floor);

  const grid = new GridHelper(ARENA_SIZE, ARENA_SIZE, 0x38bdf8, 0x1d4ed8);
  root.add(grid);

  return root;
}

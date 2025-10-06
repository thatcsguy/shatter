import type { Vector3 } from "three";

export interface SpatialEntry {
  position: Vector3;
  radius: number;
}

export class SpatialIndex {
  private readonly entries = new Map<number, SpatialEntry>();

  clear() {
    this.entries.clear();
  }

  set(entityId: number, position: Vector3, radius: number) {
    this.entries.set(entityId, { position, radius });
  }

  delete(entityId: number) {
    this.entries.delete(entityId);
  }

  queryRadius(center: Vector3, radius: number): number[] {
    const result: number[] = [];
    for (const [id, entry] of this.entries) {
      const distanceSq = center.distanceToSquared(entry.position);
      const combined = radius + entry.radius;
      if (distanceSq <= combined * combined) {
        result.push(id);
      }
    }
    return result;
  }

  *pairs(): IterableIterator<[number, number]> {
    const ids = [...this.entries.keys()];
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        yield [ids[i], ids[j]];
      }
    }
  }
}

import * as THREE from 'three';
import { MechanicStateData } from '../shared/types.js';

interface RingEntry {
  mesh: THREE.Mesh;
  startTime: number;
  endTime: number;
}

export class MechanicRenderer {
  private rings = new Map<string, RingEntry>();
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  update(mechanics: MechanicStateData[]): void {
    const now = Date.now();
    const activeKeys = new Set<string>();

    for (const m of mechanics) {
      if (m.type !== 'radialKnockback') continue;

      const key = `kb-${m.originX}-${m.originZ}-${m.startTime}`;
      activeKeys.add(key);

      if (!this.rings.has(key)) {
        const geo = new THREE.RingGeometry(3.5, 4, 64);
        const mat = new THREE.MeshBasicMaterial({
          color: 0xff4444,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.6,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(m.originX as number, 0.02, m.originZ as number);
        this.scene.add(mesh);
        this.rings.set(key, {
          mesh,
          startTime: m.startTime as number,
          endTime: m.endTime as number,
        });
      }

      // Pulse the ring opacity
      const entry = this.rings.get(key)!;
      const elapsed = now - entry.startTime;
      const pulse = 0.3 + 0.4 * Math.abs(Math.sin(elapsed * 0.005));
      (entry.mesh.material as THREE.MeshBasicMaterial).opacity = pulse;
    }

    // Remove rings no longer in mechanic state
    for (const [key, entry] of this.rings) {
      if (!activeKeys.has(key)) {
        this.scene.remove(entry.mesh);
        entry.mesh.geometry.dispose();
        (entry.mesh.material as THREE.Material).dispose();
        this.rings.delete(key);
      }
    }
  }
}

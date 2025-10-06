import type { Vector3 } from "three";

export interface EncounterBossConfig<TBoss> {
  create: () => TBoss;
  initialPosition: Vector3;
}

export interface EncounterConfig<TBoss> {
  id: string;
  boss: EncounterBossConfig<TBoss>;
}

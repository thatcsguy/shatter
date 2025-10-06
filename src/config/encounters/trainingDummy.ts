import { Vector3 } from "three";
import { TrainingDummy } from "@app/rendering/trainingDummy";
import type { EncounterConfig } from "@config/encounters/types";

export const trainingDummyEncounter: EncounterConfig<TrainingDummy> = {
  id: "training-dummy",
  boss: {
    create: () => new TrainingDummy(),
    initialPosition: new Vector3(0, 0, 0)
  }
};

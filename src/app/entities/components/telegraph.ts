import { defineComponent } from "@app/entities/component";

export interface TelegraphSegment {
  readonly label: string;
  readonly duration: number;
  readonly color?: string;
}

export interface TelegraphComponent {
  /** Seconds elapsed since the telegraph started. */
  elapsed: number;
  /** Total duration in seconds. */
  duration: number;
  /** Sequence of visual/audio cues to play. */
  segments: TelegraphSegment[];
  /** When true, the telegraph has completed and should trigger its effect. */
  completed: boolean;
}

export const TelegraphComponentType = defineComponent<TelegraphComponent>("core.telegraph", () => ({
  elapsed: 0,
  duration: 0,
  segments: [],
  completed: false
}));

export function createTelegraphSequence(...segments: TelegraphSegment[]): TelegraphComponent {
  const duration = segments.reduce((total, segment) => total + segment.duration, 0);
  return {
    elapsed: 0,
    duration,
    segments: [...segments],
    completed: false
  };
}

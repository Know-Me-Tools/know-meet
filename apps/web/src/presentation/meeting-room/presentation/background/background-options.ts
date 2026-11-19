// TJ-ARCH-MOB-001 compliant
// The five background choices (background-effects shape, sections 2 and 7; WC-4) and the
// mapping between a choice and the room's requested effect. Images are the approved brand
// abstracts Ground, Dusk and Tide, served from the app's own origin
// (`/backgrounds/<name>.webp`, thumbnails `<name>-thumb.webp`). Also the value the local
// tile reports in `data-video-processor` (scenario contract EFFECTS.processorAttribute).
import {
  BACKGROUND_BLUR,
  type BackgroundEffect,
  type BackgroundEffectState,
  NO_BACKGROUND_EFFECT,
  sameBackgroundEffect,
} from "@know-meet/domain";

export type BackgroundChoiceId = "none" | "blur" | "ground" | "dusk" | "tide";

export interface BackgroundChoice {
  readonly id: BackgroundChoiceId;
  /** The card label. */
  readonly name: string;
  /** The radio's accessible name: what the choice does, not only its name. */
  readonly accessibleName: string;
  readonly effect: BackgroundEffect;
  /** Decorative thumbnail; null draws a glyph on the `tile` fill instead. */
  readonly thumbnail: string | null;
  readonly testId: string;
}

function imageChoice(id: "ground" | "dusk" | "tide", name: string): BackgroundChoice {
  return {
    id,
    name,
    accessibleName: `Image background: ${name}`,
    effect: { kind: "image", imageUrl: `/backgrounds/${id}.webp` },
    thumbnail: `/backgrounds/${id}-thumb.webp`,
    testId: "km-effect-image-option",
  };
}

export const BACKGROUND_CHOICES: readonly BackgroundChoice[] = [
  {
    id: "none",
    name: "None",
    accessibleName: "None",
    effect: NO_BACKGROUND_EFFECT,
    thumbnail: null,
    testId: "km-effect-off",
  },
  {
    id: "blur",
    name: "Blur",
    accessibleName: "Blur your background",
    effect: BACKGROUND_BLUR,
    thumbnail: null,
    testId: "km-effect-blur",
  },
  imageChoice("ground", "Ground"),
  imageChoice("dusk", "Dusk"),
  imageChoice("tide", "Tide"),
];

export function choiceOfEffect(effect: BackgroundEffect): BackgroundChoice | null {
  return BACKGROUND_CHOICES.find((choice) => sameBackgroundEffect(choice.effect, effect)) ?? null;
}

export function choiceById(id: string): BackgroundChoice | null {
  return BACKGROUND_CHOICES.find((choice) => choice.id === id) ?? null;
}

export type VideoProcessorName = "none" | "background-blur" | "virtual-background";

/**
 * What the published camera carries. The room reports `active` only once the processor is
 * on the camera track, so anything short of that is `none`.
 */
export function videoProcessorName(state: BackgroundEffectState): VideoProcessorName {
  if (state.status !== "active") return "none";
  if (state.effect.kind === "blur") return "background-blur";
  if (state.effect.kind === "image") return "virtual-background";
  return "none";
}

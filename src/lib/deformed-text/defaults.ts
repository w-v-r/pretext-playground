import { bleedPalettes, palettes } from "./palette"
import type { DeformOptions, GradientOptions } from "./types"

export const defaultGradient: GradientOptions = {
  stops: palettes.cover,
  angle: 70,
  cycle: 0.42,
  phase: 0,
  noise: 0.25,
}

export const defaultDeform: DeformOptions = {
  probability: 0.12,
  minPerBlock: 2,
  maxPerBlock: 4,
  eligible: "\\p{Ll}",
  minGap: 2,
  smearLength: 0.95,
  blur: 0.09,
  chromaticOffset: 0.035,
  noise: 0.5,
  intensity: 1,
  directions: ["down", "up", "both"],
  cutRange: [0.5, 0.85],
  bleedColors: bleedPalettes.prism,
  bodyRetention: 0.3,
}

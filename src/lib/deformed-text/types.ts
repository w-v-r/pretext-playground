export type BleedDirection = "up" | "down" | "both"

export type GradientOptions = {
  /** Pastel colour stops, any CSS hex colours. The palette loops. */
  stops: readonly string[]
  /** Direction of the colour ramp in degrees (0 = left to right, 90 = top to bottom). */
  angle: number
  /** Length of one full palette cycle, as a fraction of the layout width. */
  cycle: number
  /** Shifts the ramp along its axis (0..1 = one full cycle). */
  phase: number
  /** Random per-glyph shift of the ramp, 0..1. */
  noise: number
}

export type DeformOptions = {
  /** Chance that an eligible glyph is deformed. Selection is stable per seed. */
  probability: number
  /** Guarantees at least this many deformed glyphs per block. */
  minPerBlock: number
  /** Never deform more than this many glyphs per block. */
  maxPerBlock: number
  /** Regex source (unicode flag) a glyph must match to be deformable. Defaults to lowercase letters. */
  eligible: string
  /** Minimum number of glyphs between two deformed glyphs. */
  minGap: number
  /** Smear length, in em (multiples of the block font size). */
  smearLength: number
  /** Blur radius of the colour bleed, in em. */
  blur: number
  /** Horizontal offset of the red / blue colour channels, in em. */
  chromaticOffset: number
  /** Wobble of the drips and smear sampling jitter, 0..1. */
  noise: number
  /** Overall opacity of the saturated bleed, 0..1+. */
  intensity: number
  /** Which way glyphs may bleed. Picked per glyph. */
  directions: readonly BleedDirection[]
  /** Where along the glyph ink height the smear is sampled (0 = top, 1 = bottom). */
  cutRange: readonly [number, number]
  /** Saturated colours bleeding off the glyph. */
  bleedColors: readonly string[]
  /** How much of the smeared-away half of the glyph survives, 0..1. */
  bodyRetention: number
}

export type TextBlock = {
  text: string
  fontSize: number
  /** Line height multiplier. Defaults to 1.12. */
  lineHeight?: number
  fontWeight?: number | string
  fontStyle?: "normal" | "italic"
  /** Overrides the family passed to the layout function. */
  fontFamily?: string
  /** Space above the block, in px. */
  marginTop?: number
  align?: "left" | "center" | "right"
  /** Narrower wrap width than the layout width, in px. */
  maxWidth?: number
  /** Per-block deformation overrides; `false` disables deformation. */
  deform?: Partial<DeformOptions> | false
  gradient?: Partial<GradientOptions>
}

export type GlyphDeform = {
  direction: BleedDirection
  cutFraction: number
  lengthScale: number
  channelOrder: readonly [number, number, number]
  seed: number
}

export type Glyph = {
  char: string
  /** Left edge of the glyph, in layout px. */
  x: number
  /** Baseline, in layout px. */
  baseline: number
  advance: number
  /** Ink extents above / below the baseline. */
  inkAscent: number
  inkDescent: number
  fontSize: number
  font: string
  blockIndex: number
  lineIndex: number
  /** Index across the whole layout. */
  index: number
  deform?: GlyphDeform
}

export type LayoutLine = {
  text: string
  x: number
  baseline: number
  width: number
  lineHeight: number
  glyphs: Glyph[]
}

export type LayoutBlock = {
  block: TextBlock
  top: number
  height: number
  font: string
  lines: LayoutLine[]
}

export type TextLayout = {
  width: number
  height: number
  blocks: LayoutBlock[]
  glyphs: Glyph[]
}

export type PaintOptions = {
  deform: DeformOptions
  gradient: GradientOptions
  /** CSS colour painted behind the text. `null` leaves the canvas transparent. */
  background: string | null
  devicePixelRatio: number
  /** Extra canvas room around the layout so smears can overflow it, in px. */
  bleed: number
}

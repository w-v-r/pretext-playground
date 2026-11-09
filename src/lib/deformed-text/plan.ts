import { defaultDeform } from "./defaults"
import { clamp, createRng, hashToUnit, toSeedNumber } from "./random"
import type { BleedDirection, DeformOptions, Glyph, GlyphDeform, TextLayout } from "./types"

// Weighted towards blue -> red -> yellow, the order seen on the reference cover.
const permutations: ReadonlyArray<readonly [number, number, number]> = [
  [0, 1, 2],
  [0, 1, 2],
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [2, 1, 0],
]

export const resolveDeformOptions = (
  base: DeformOptions,
  override?: Partial<DeformOptions> | false,
): DeformOptions | null => {
  if (override === false) return null
  return { ...base, ...override }
}

const buildGlyphDeform = (glyph: Glyph, options: DeformOptions, seed: number): GlyphDeform => {
  const rng = createRng((seed ^ Math.imul(glyph.index + 7, 0x85ebca6b)) >>> 0)
  const directions = options.directions.length ? options.directions : defaultDeform.directions
  const direction: BleedDirection = directions[Math.floor(rng() * directions.length)]
  const [cutMin, cutMax] = options.cutRange
  return {
    direction,
    cutFraction: clamp(cutMin + rng() * (cutMax - cutMin), 0, 1),
    lengthScale: 0.6 + rng() * 0.6,
    channelOrder: permutations[Math.floor(rng() * permutations.length)],
    seed: Math.floor(rng() * 1e9),
  }
}

/**
 * Chooses which glyphs get deformed and writes `glyph.deform`. The ranking of
 * glyphs depends only on the seed, so raising `probability` adds glyphs without
 * reshuffling the ones that were already chosen.
 */
export const planDeformations = (
  layout: TextLayout,
  baseOptions: DeformOptions,
  seed: number | string,
): void => {
  const seedNumber = toSeedNumber(seed)

  layout.glyphs.forEach((glyph) => {
    glyph.deform = undefined
  })

  layout.blocks.forEach((layoutBlock, blockIndex) => {
    const options = resolveDeformOptions(baseOptions, layoutBlock.block.deform)
    if (!options) return

    const eligibleChars = new RegExp(options.eligible, "u")
    const eligible = layoutBlock.lines
      .flatMap((line) => line.glyphs)
      .filter((glyph) => eligibleChars.test(glyph.char))
    const ranked = eligible
      .map((glyph) => ({ glyph, score: hashToUnit(seedNumber, glyph.index * 31 + blockIndex) }))
      .sort((a, b) => a.score - b.score)

    const wanted = clamp(
      Math.round(options.probability * eligible.length),
      options.minPerBlock,
      options.maxPerBlock,
    )
    const effective = options.probability <= 0 ? 0 : wanted

    const chosen: Glyph[] = []
    for (const { glyph } of ranked) {
      if (chosen.length >= effective) break
      const tooClose = chosen.some((other) => Math.abs(other.index - glyph.index) <= options.minGap)
      if (tooClose) continue
      chosen.push(glyph)
    }

    chosen.forEach((glyph) => {
      glyph.deform = buildGlyphDeform(glyph, options, seedNumber)
    })
  })
}

import { defaultDeform, defaultGradient } from "./defaults"
import { layoutTextBlocks } from "./layout"
import { paintDeformedText } from "./paint"
import { planDeformations } from "./plan"
import type { DeformOptions, GradientOptions, TextBlock, TextLayout } from "./types"

export type RenderDeformedTextOptions = {
  width: number
  fontFamily: string
  seed?: number | string
  deform?: Partial<DeformOptions>
  gradient?: Partial<GradientOptions>
  background?: string | null
  devicePixelRatio?: number
  /** Extra canvas margin so smears can overflow the text box. Defaults to the longest smear. */
  bleed?: number
}

export type RenderedDeformedText = { layout: TextLayout; bleed: number }

export const computeBleed = (blocks: TextBlock[], deform: DeformOptions): number =>
  Math.ceil(
    blocks.reduce((largest, block) => {
      const options = block.deform === false ? null : { ...deform, ...block.deform }
      if (!options) return largest
      const reach = block.fontSize * (options.smearLength * 1.4 + options.blur * 3 + options.chromaticOffset * 3)
      return Math.max(largest, reach)
    }, 0) + 8,
  )

/**
 * One-call renderer: lays the blocks out with pretext, picks the deformed glyphs
 * from the seed, resizes the canvas and paints. Fonts must already be loaded.
 */
export const renderDeformedText = (
  canvas: HTMLCanvasElement,
  blocks: TextBlock[],
  options: RenderDeformedTextOptions,
): RenderedDeformedText => {
  const deform = { ...defaultDeform, ...options.deform }
  const gradient = { ...defaultGradient, ...options.gradient }
  const seed = options.seed ?? 1
  const dpr = options.devicePixelRatio ?? (typeof window === "undefined" ? 1 : window.devicePixelRatio || 1)
  const bleed = options.bleed ?? computeBleed(blocks, deform)

  const layout = layoutTextBlocks(blocks, { width: options.width, fontFamily: options.fontFamily })
  planDeformations(layout, deform, seed)

  canvas.width = Math.ceil((layout.width + bleed * 2) * dpr)
  canvas.height = Math.ceil((layout.height + bleed * 2) * dpr)
  canvas.style.width = `${layout.width + bleed * 2}px`
  canvas.style.height = `${layout.height + bleed * 2}px`

  const context = canvas.getContext("2d")
  if (!context) throw new Error("Canvas 2D is not available")
  paintDeformedText(
    context,
    layout,
    { deform, gradient, background: options.background ?? null, devicePixelRatio: dpr, bleed },
    seed,
  )
  return { layout, bleed }
}

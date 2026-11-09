import { resolveDeformOptions } from "./plan"
import { clamp, hashToUnit, noise1d, toSeedNumber } from "./random"
import { parseColor, rgbToCss, samplePalette } from "./palette"
import type { DeformOptions, Glyph, GlyphDeform, GradientOptions, PaintOptions, TextLayout } from "./types"

type Surface = { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D }

const GRADIENT_STOP_COUNT = 7
/** Height of the sampled pixel row that gets stretched, in em. */
const SAMPLE_BAND_EM = 0.012
const DRIP_SEGMENTS = 18
const SMEAR_GAIN = 2
const BODY_BLUR_FACTOR = 0.45
const HALO_BLUR_FACTOR = 2.2
const HALO_ALPHA = 0.8
const STRETCH_ALPHA = 0.9
const STRETCH_BLUR_FACTOR = 0.5
const SMEAR_BLUR_FACTOR = 0.35
const FRINGE_BLUR_FACTOR = 0.6

const createSurface = (width: number, height: number): Surface => {
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.ceil(width))
  canvas.height = Math.max(1, Math.ceil(height))
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Canvas 2D is not available")
  return { canvas, context }
}

const supportsContextFilter = (() => {
  let cached: boolean | null = null
  return () => {
    if (cached !== null) return cached
    cached = typeof document !== "undefined" && "filter" in document.createElement("canvas").getContext("2d")!
    return cached
  }
})()

/** Draws `source` into `target` blurred by `radius` device px (pixel space, identity transform). */
const drawBlurred = (
  target: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  dx: number,
  dy: number,
  radius: number,
  gain = 1,
) => {
  for (let pass = 0; pass < gain; pass++) drawBlurredOnce(target, source, dx, dy, radius)
}

const drawBlurredOnce = (
  target: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  dx: number,
  dy: number,
  radius: number,
) => {
  if (radius < 0.5) {
    target.drawImage(source, dx, dy)
    return
  }
  if (supportsContextFilter()) {
    target.filter = `blur(${radius}px)`
    target.drawImage(source, dx, dy)
    target.filter = "none"
    return
  }
  const factor = Math.max(2, Math.round(radius))
  const small = createSurface(source.width / factor, source.height / factor)
  small.context.imageSmoothingQuality = "high"
  small.context.drawImage(source, 0, 0, small.canvas.width, small.canvas.height)
  target.save()
  target.imageSmoothingQuality = "high"
  target.drawImage(small.canvas, dx, dy, small.canvas.width * factor, small.canvas.height * factor)
  target.restore()
}

const tintCanvas = (source: HTMLCanvasElement, fill: string | CanvasGradient): Surface => {
  const surface = createSurface(source.width, source.height)
  surface.context.drawImage(source, 0, 0)
  surface.context.globalCompositeOperation = "source-in"
  surface.context.fillStyle = fill
  surface.context.fillRect(0, 0, source.width, source.height)
  return surface
}

type GradientParams = {
  stops: ReturnType<typeof parseColor>[]
  options: GradientOptions
  layoutWidth: number
}

const gradientParamsFor = (options: GradientOptions, layoutWidth: number): GradientParams => ({
  stops: options.stops.map(parseColor),
  options,
  layoutWidth,
})

/**
 * Builds a linear gradient for one glyph whose colours come from a palette ramp
 * running across the whole layout. `originX/Y` is where the target canvas starts
 * in layout space and `scale` converts layout px to target px.
 */
const createGlyphGradient = (
  context: CanvasRenderingContext2D,
  glyph: Glyph,
  params: GradientParams,
  seed: number,
  originX: number,
  originY: number,
  scale: number,
): CanvasGradient => {
  const { options, stops, layoutWidth } = params
  const radians = (options.angle * Math.PI) / 180
  const dirX = Math.cos(radians)
  const dirY = Math.sin(radians)
  const cycleLength = Math.max(1, options.cycle * layoutWidth)
  const centerX = glyph.x + glyph.advance / 2
  const centerY = glyph.baseline - glyph.fontSize * 0.3
  const half = glyph.fontSize * 0.55
  const jitter = (hashToUnit(seed, glyph.index + 101) - 0.5) * options.noise
  const wobble = noise1d(seed, centerX / (cycleLength * 0.35)) * options.noise * 0.25
  const tAt = (x: number, y: number) => (x * dirX + y * dirY) / cycleLength + options.phase + jitter + wobble
  const startX = centerX - dirX * half
  const startY = centerY - dirY * half
  const endX = centerX + dirX * half
  const endY = centerY + dirY * half
  const tStart = tAt(startX, startY)
  const tEnd = tAt(endX, endY)

  const gradient = context.createLinearGradient(
    (startX - originX) * scale,
    (startY - originY) * scale,
    (endX - originX) * scale,
    (endY - originY) * scale,
  )
  for (let step = 0; step < GRADIENT_STOP_COUNT; step++) {
    const position = step / (GRADIENT_STOP_COUNT - 1)
    const color = samplePalette(stops, tStart + (tEnd - tStart) * position)
    gradient.addColorStop(position, rgbToCss(color))
  }
  return gradient
}

type SmearInput = {
  glyphMask: HTMLCanvasElement
  /** Source rows (device px) that get stretched into the streak. */
  sourceTop: number
  sourceHeight: number
  length: number
  direction: "up" | "down"
  wobble: number
  /** Strength of the scan-line banding along the streak, 0..1. */
  grain: number
  seed: number
}

/** Stretches one pixel row of the glyph into a long vertical streak, with drifting drips. */
const buildSmearMask = (input: SmearInput): HTMLCanvasElement => {
  const { glyphMask, sourceTop, sourceHeight, length, direction, wobble, grain, seed } = input
  const width = glyphMask.height > 0 ? glyphMask.width : 1
  const stretched = createSurface(width, glyphMask.height)
  const sampleY = clamp(Math.round(sourceTop), 0, glyphMask.height - 1)
  const sampleHeight = clamp(Math.round(sourceHeight), 1, glyphMask.height - sampleY)
  const destTop = direction === "down" ? sampleY : sampleY + sampleHeight - length
  stretched.context.drawImage(glyphMask, 0, sampleY, width, sampleHeight, 0, destTop, width, length)

  const drifted = createSurface(width, glyphMask.height)
  const segmentHeight = length / DRIP_SEGMENTS
  for (let segment = 0; segment < DRIP_SEGMENTS; segment++) {
    const distance = direction === "down" ? segment / DRIP_SEGMENTS : 1 - (segment + 1) / DRIP_SEGMENTS
    const shift = noise1d(seed, segment * 0.55) * wobble * (0.25 + distance)
    const top = destTop + segment * segmentHeight
    drifted.context.drawImage(stretched.canvas, 0, top, width, segmentHeight + 1, shift, top, width, segmentHeight + 1)
  }

  const bandStep = Math.max(2, Math.round(length / 40))
  drifted.context.globalCompositeOperation = "destination-out"
  for (let y = destTop; y < destTop + length; y += bandStep) {
    const dim = Math.max(0, noise1d(seed + 17, y / (bandStep * 1.6))) * grain * 0.9
    drifted.context.fillStyle = `rgba(0,0,0,${dim})`
    drifted.context.fillRect(0, y, width, bandStep)
  }

  const fade = drifted.context.createLinearGradient(0, direction === "down" ? destTop : destTop + length, 0, direction === "down" ? destTop + length : destTop)
  fade.addColorStop(0, "rgba(255,255,255,1)")
  fade.addColorStop(0.5, "rgba(255,255,255,0.75)")
  fade.addColorStop(1, "rgba(255,255,255,0)")
  drifted.context.globalCompositeOperation = "destination-in"
  drifted.context.fillStyle = fade
  drifted.context.fillRect(0, 0, width, glyphMask.height)
  return drifted.canvas
}

type DeformedGlyphInput = {
  target: CanvasRenderingContext2D
  glyph: Glyph
  deform: GlyphDeform
  options: DeformOptions
  gradient: GradientParams
  seed: number
  originX: number
  originY: number
  scale: number
}

const paintDeformedGlyph = (input: DeformedGlyphInput) => {
  const { target, glyph, deform, options, gradient, seed, originX, originY, scale } = input
  const size = glyph.fontSize
  const length = options.smearLength * size * deform.lengthScale
  const blur = options.blur * size
  const chroma = options.chromaticOffset * size
  const wobble = options.noise * size * 0.08

  const padX = Math.ceil(chroma * 2.5 + blur * 3 + wobble * 2 + 4)
  const padY = Math.ceil(length + blur * 3 + 4)
  const inkHeight = glyph.inkAscent + glyph.inkDescent
  const boxWidth = Math.ceil(glyph.advance) + padX * 2
  const boxHeight = Math.ceil(inkHeight) + padY * 2
  const boxLeft = glyph.x - padX
  const boxTop = glyph.baseline - glyph.inkAscent - padY

  const pixelWidth = boxWidth * scale
  const pixelHeight = boxHeight * scale
  const glyphMask = createSurface(pixelWidth, pixelHeight)
  glyphMask.context.scale(scale, scale)
  glyphMask.context.font = glyph.font
  glyphMask.context.fillStyle = "#fff"
  glyphMask.context.textBaseline = "alphabetic"
  glyphMask.context.fillText(glyph.char, padX, padY + glyph.inkAscent)

  const localGradient = createGlyphGradient(glyphMask.context, glyph, gradient, seed, boxLeft, boxTop, scale)
  const colored = tintCanvas(glyphMask.canvas, localGradient)

  const cutY = (padY + inkHeight * deform.cutFraction) * scale
  const bandHeight = Math.max(1, Math.round(SAMPLE_BAND_EM * size * scale))
  const directions: Array<"up" | "down"> = deform.direction === "both" ? ["up", "down"] : [deform.direction]

  const keepRegion = (surface: Surface, retention: number): Surface => {
    if (deform.direction === "both") return surface
    const result = createSurface(surface.canvas.width, surface.canvas.height)
    const keepTop = deform.direction === "down"
    const splitY = Math.round(cutY)
    const kept = keepTop ? { y: 0, height: splitY } : { y: splitY, height: surface.canvas.height - splitY }
    const dropped = keepTop ? { y: splitY, height: surface.canvas.height - splitY } : { y: 0, height: splitY }
    result.context.drawImage(surface.canvas, 0, kept.y, surface.canvas.width, kept.height, 0, kept.y, surface.canvas.width, kept.height)
    if (retention > 0) {
      result.context.globalAlpha = retention
      result.context.drawImage(surface.canvas, 0, dropped.y, surface.canvas.width, dropped.height, 0, dropped.y, surface.canvas.width, dropped.height)
    }
    return result
  }

  const destX = Math.round((boxLeft - originX) * scale)
  const destY = Math.round((boxTop - originY) * scale)
  const body = keepRegion(colored, options.bodyRetention)

  target.save()
  target.setTransform(1, 0, 0, 1, 0, 0)

  target.globalCompositeOperation = "source-over"
  target.globalAlpha = 0.6
  drawBlurred(target, body.canvas, destX, destY, 0)
  target.globalAlpha = 0.75
  drawBlurred(target, body.canvas, destX, destY, blur * BODY_BLUR_FACTOR * scale)
  target.globalAlpha = 1

  target.globalCompositeOperation = "lighter"
  const ghostRed = tintCanvas(body.canvas, rgbToCss(parseColor(options.bleedColors[1] ?? "#ff2a2a"), 0.95 * options.intensity))
  const ghostBlue = tintCanvas(body.canvas, rgbToCss(parseColor(options.bleedColors[0] ?? "#1f4dff"), 1 * options.intensity))
  drawBlurred(target, ghostRed.canvas, destX - chroma * 1.5 * scale, destY, blur * 0.7 * scale, 2)
  drawBlurred(target, ghostBlue.canvas, destX + chroma * 1.5 * scale, destY, blur * 0.7 * scale, 2)

  const bleedColor = (slot: number) =>
    parseColor(options.bleedColors[deform.channelOrder[slot] % options.bleedColors.length])
  const colorAt = (slot: number, alpha: number) => rgbToCss(bleedColor(slot), clamp(alpha * options.intensity, 0, 1))

  directions.forEach((direction, directionIndex) => {
    const sideLength = Math.round(length * scale)
    const sideSeed = deform.seed + directionIndex * 977
    const sign = direction === "down" ? 1 : -1
    const inkTop = padY * scale
    const inkBottom = (padY + inkHeight) * scale
    const makeMask = (lengthFactor: number, seedOffset: number, shapeAware = false) =>
      buildSmearMask({
        glyphMask: glyphMask.canvas,
        sourceTop: shapeAware && direction === "up" ? inkTop : cutY,
        sourceHeight: shapeAware ? (direction === "up" ? cutY - inkTop : inkBottom - cutY) : bandHeight,
        length: Math.round(sideLength * lengthFactor),
        direction,
        wobble: wobble * scale,
        grain: options.noise,
        seed: sideSeed + seedOffset,
      })

    const ramp = target.createLinearGradient(0, cutY, 0, cutY + sign * sideLength)
    ramp.addColorStop(0, "rgba(255,250,235,0.3)")
    ramp.addColorStop(0.14, colorAt(0, 1))
    ramp.addColorStop(0.5, colorAt(1, 0.9))
    ramp.addColorStop(1, colorAt(2, 0.65))
    const smear = tintCanvas(makeMask(1, 0), ramp).canvas
    const stretchedBody = tintCanvas(makeMask(0.85, 53, true), ramp).canvas
    target.globalCompositeOperation = "source-over"
    target.globalAlpha = STRETCH_ALPHA
    drawBlurred(target, stretchedBody, destX, destY, blur * STRETCH_BLUR_FACTOR * scale)
    target.globalAlpha = 1
    target.globalCompositeOperation = "source-over"
    target.globalAlpha = HALO_ALPHA
    drawBlurred(target, smear, destX, destY, blur * HALO_BLUR_FACTOR * scale, 2)
    target.globalAlpha = 1
    drawBlurred(target, smear, destX, destY, blur * SMEAR_BLUR_FACTOR * scale, SMEAR_GAIN)
    target.globalCompositeOperation = "lighter"

    ;([-1, 1] as const).forEach((side) => {
      const fringe = tintCanvas(makeMask(0.75, side * 311), colorAt(side < 0 ? 1 : 0, 0.6))
      drawBlurred(target, fringe.canvas, destX + side * chroma * 1.6 * scale, destY, blur * FRINGE_BLUR_FACTOR * scale, 2)
    })
  })

  target.restore()
}

/**
 * Paints a laid-out text onto a canvas context. The context is expected to be
 * sized `(layout.width + 2 * bleed) * dpr` by `(layout.height + 2 * bleed) * dpr`.
 */
export const paintDeformedText = (
  context: CanvasRenderingContext2D,
  layout: TextLayout,
  options: PaintOptions,
  seed: number | string,
): void => {
  const scale = options.devicePixelRatio
  const seedNumber = toSeedNumber(seed)
  const canvas = context.canvas

  context.save()
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.clearRect(0, 0, canvas.width, canvas.height)
  if (options.background) {
    context.fillStyle = options.background
    context.fillRect(0, 0, canvas.width, canvas.height)
  }
  context.setTransform(scale, 0, 0, scale, options.bleed * scale, options.bleed * scale)
  context.textBaseline = "alphabetic"

  layout.blocks.forEach((layoutBlock) => {
    const blockGradient = { ...options.gradient, ...layoutBlock.block.gradient }
    const gradient = gradientParamsFor(blockGradient, layout.width)
    const deformOptions = resolveDeformOptions(options.deform, layoutBlock.block.deform)

    layoutBlock.lines.forEach((line) => {
      line.glyphs.forEach((glyph) => {
        if (!glyph.char.trim()) return

        if (glyph.deform && deformOptions) {
          paintDeformedGlyph({
            target: context,
            glyph,
            deform: glyph.deform,
            options: deformOptions,
            gradient,
            seed: seedNumber,
            originX: -options.bleed,
            originY: -options.bleed,
            scale,
          })
          return
        }

        context.font = glyph.font
        context.fillStyle = createGlyphGradient(context, glyph, gradient, seedNumber, 0, 0, 1)
        context.fillText(glyph.char, glyph.x, glyph.baseline)
      })
    })
  })

  context.restore()
}

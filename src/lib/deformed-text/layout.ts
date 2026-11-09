import { layoutWithLines, prepareWithSegments } from "@chenglou/pretext"
import type { Glyph, LayoutBlock, LayoutLine, TextBlock, TextLayout } from "./types"

export type LayoutOptions = {
  /** Layout width in px. Blocks wrap inside it using pretext. */
  width: number
  /** Default font family for every block. Must be a resolved CSS family list. */
  fontFamily: string
}

const DEFAULT_LINE_HEIGHT = 1.12

export const buildFont = (block: TextBlock, fontFamily: string) =>
  `${block.fontStyle ?? "normal"} ${block.fontWeight ?? 300} ${block.fontSize}px ${block.fontFamily ?? fontFamily}`

let measureContext: CanvasRenderingContext2D | null = null

const getMeasureContext = (): CanvasRenderingContext2D => {
  if (measureContext) return measureContext
  const context = document.createElement("canvas").getContext("2d")
  if (!context) throw new Error("Canvas 2D is not available")
  measureContext = context
  return context
}

const splitGraphemes = (text: string): string[] => {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" })
    return Array.from(segmenter.segment(text), (part) => part.segment)
  }
  return Array.from(text)
}

const alignOffset = (align: TextBlock["align"], available: number, lineWidth: number) => {
  if (align === "center") return (available - lineWidth) / 2
  if (align === "right") return available - lineWidth
  return 0
}

/**
 * Lays out text blocks with pretext (line breaking) and resolves a position for
 * every glyph. Positions come from prefix measurements, so kerning is preserved
 * even though each glyph is painted individually.
 *
 * Fonts must already be loaded: pretext caches measurements per font.
 */
export const layoutTextBlocks = (blocks: TextBlock[], options: LayoutOptions): TextLayout => {
  const context = getMeasureContext()
  const glyphs: Glyph[] = []
  const layoutBlocks: LayoutBlock[] = []
  let cursorY = 0

  blocks.forEach((block, blockIndex) => {
    const font = buildFont(block, options.fontFamily)
    const lineHeight = block.fontSize * (block.lineHeight ?? DEFAULT_LINE_HEIGHT)
    const wrapWidth = Math.min(options.width, block.maxWidth ?? options.width)
    const blockTop = cursorY + (blockIndex === 0 ? 0 : (block.marginTop ?? 0))

    context.font = font
    const fontMetrics = context.measureText("Hg")
    const fontAscent = fontMetrics.fontBoundingBoxAscent
    const fontDescent = fontMetrics.fontBoundingBoxDescent

    const prepared = prepareWithSegments(block.text, font)
    const result = layoutWithLines(prepared, wrapWidth, lineHeight)

    const lines: LayoutLine[] = result.lines.map((line, lineIndex) => {
      const lineTop = blockTop + lineIndex * lineHeight
      const baseline = lineTop + lineHeight / 2 + (fontAscent - fontDescent) / 2
      const lineX = alignOffset(block.align, options.width, line.width)
      const text = line.text.trimEnd()
      const lineGlyphs: Glyph[] = []

      context.font = font
      splitGraphemes(text).reduce((consumed, char) => {
        const startX = context.measureText(consumed).width
        const next = consumed + char
        const advance = context.measureText(next).width - startX
        const ink = context.measureText(char)
        const glyph: Glyph = {
          char,
          x: lineX + startX,
          baseline,
          advance,
          inkAscent: ink.actualBoundingBoxAscent,
          inkDescent: ink.actualBoundingBoxDescent,
          fontSize: block.fontSize,
          font,
          blockIndex,
          lineIndex,
          index: glyphs.length,
        }
        lineGlyphs.push(glyph)
        glyphs.push(glyph)
        return next
      }, "")

      return { text, x: lineX, baseline, width: line.width, lineHeight, glyphs: lineGlyphs }
    })

    layoutBlocks.push({ block, top: blockTop, height: result.height, font, lines })
    cursorY = blockTop + result.height
  })

  return { width: options.width, height: cursorY, blocks: layoutBlocks, glyphs }
}

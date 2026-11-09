"use client"

import { useEffect, useRef, useState } from "react"
import { ensureFontsLoaded, resolveFontFamily } from "./fonts"
import { renderDeformedText } from "./render"
import type { DeformOptions, GradientOptions, TextBlock, TextLayout } from "./types"

export type DeformedTextProps = {
  blocks: TextBlock[]
  /** CSS font family or `var(--font-x)` reference. */
  fontFamily: string
  seed?: number | string
  deform?: Partial<DeformOptions>
  gradient?: Partial<GradientOptions>
  /** Defaults to transparent so the text sits on whatever is behind it. */
  background?: string | null
  /** Fixed layout width in px. Defaults to the width of the wrapper. */
  width?: number
  className?: string
  /** Called after every paint with the pretext layout (glyph positions, lines). */
  onLayout?: (layout: TextLayout) => void
}

export const DeformedText = ({
  blocks,
  fontFamily,
  seed = 1,
  deform,
  gradient,
  background = null,
  width,
  className,
  onLayout,
}: DeformedTextProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [measuredWidth, setMeasuredWidth] = useState(0)
  const [layoutSize, setLayoutSize] = useState({ height: 0, bleed: 0 })

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper || width !== undefined) return
    const observer = new ResizeObserver(([entry]) => setMeasuredWidth(Math.floor(entry.contentRect.width)))
    observer.observe(wrapper)
    return () => observer.disconnect()
  }, [width])

  const layoutWidth = width ?? measuredWidth
  const blocksKey = JSON.stringify(blocks)
  const deformKey = JSON.stringify(deform)
  const gradientKey = JSON.stringify(gradient)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || layoutWidth <= 0) return
    let cancelled = false

    const draw = async () => {
      const family = resolveFontFamily(canvas, fontFamily)
      await ensureFontsLoaded(blocks, family)
      if (cancelled) return
      const { layout, bleed } = renderDeformedText(canvas, blocks, {
        width: layoutWidth,
        fontFamily: family,
        seed,
        deform,
        gradient,
        background,
      })
      setLayoutSize({ height: layout.height, bleed })
      onLayout?.(layout)
    }
    draw()

    return () => {
      cancelled = true
    }
    // The JSON keys stand in for deep comparison of the object props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocksKey, deformKey, gradientKey, fontFamily, seed, background, layoutWidth])

  const ariaLabel = blocks.map((block) => block.text).join(". ")

  return (
    <div
      ref={wrapperRef}
      className={`relative ${className ?? ""}`}
      style={{ width, height: layoutSize.height || undefined }}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={ariaLabel}
        className="pointer-events-none absolute max-w-none"
        style={{ left: -layoutSize.bleed, top: -layoutSize.bleed }}
      />
    </div>
  )
}

"use client"

import { useState } from "react"
import { DeformedText, bleedPalettes, defaultDeform, defaultGradient, palettes } from "@/lib/deformed-text"
import type { BleedPaletteName, DeformOptions, PaletteName, TextBlock } from "@/lib/deformed-text"

const COVER_WIDTH = 668
const COVER_HEIGHT = 1024
const COVER_PADDING_X = 58
const FONT_FAMILY = "var(--font-deformed-serif), Georgia, serif"

const coverBlocks: TextBlock[] = [
  { text: "The AGI Chronicles", fontSize: 74, fontWeight: 700, lineHeight: 1.2, maxWidth: 400 },
  {
    text: "The Inside Story of the Race to Create an Artificial Superintelligence",
    fontSize: 66,
    fontWeight: 400,
    lineHeight: 1.34,
    marginTop: 97,
  },
  { text: "Kevin Roose", fontSize: 74, fontWeight: 700, lineHeight: 1.1, marginTop: 104 },
]

type SliderConfig = {
  key: "probability" | "smearLength" | "blur" | "chromaticOffset" | "noise" | "intensity"
  label: string
  min: number
  max: number
  step: number
}

const sliders: SliderConfig[] = [
  { key: "probability", label: "Deformation probability", min: 0, max: 0.3, step: 0.005 },
  { key: "smearLength", label: "Smear length (em)", min: 0, max: 1.4, step: 0.01 },
  { key: "blur", label: "Blur (em)", min: 0, max: 0.25, step: 0.005 },
  { key: "chromaticOffset", label: "Chromatic offset (em)", min: 0, max: 0.2, step: 0.005 },
  { key: "noise", label: "Noise", min: 0, max: 1, step: 0.01 },
  { key: "intensity", label: "Bleed intensity", min: 0, max: 1.5, step: 0.01 },
]

type ViewMode = "compare" | "ours" | "reference"
const viewModes: { id: ViewMode; label: string }[] = [
  { id: "compare", label: "Side by side" },
  { id: "ours", label: "Ours" },
  { id: "reference", label: "Reference" },
]

const Cover = ({ children, label }: { children: React.ReactNode; label: string }) => (
  <figure className="m-0 flex flex-col gap-2">
    <div
      className="relative overflow-hidden bg-black"
      style={{ width: COVER_WIDTH, height: COVER_HEIGHT }}
    >
      {children}
    </div>
    <figcaption className="text-xs uppercase tracking-widest text-neutral-500">{label}</figcaption>
  </figure>
)

type Variant = {
  title: string
  blocks: TextBlock[]
  palette: PaletteName
  bleed: BleedPaletteName
  deform: Partial<DeformOptions>
  angle: number
}

const variants: Variant[] = [
  {
    title: "Rainbow, centered poster",
    palette: "rainbow",
    bleed: "neon",
    angle: 35,
    deform: { probability: 0.2, maxPerBlock: 5, smearLength: 1.1, chromaticOffset: 0.06 },
    blocks: [
      { text: "Deformed", fontSize: 96, fontWeight: 600, align: "center", lineHeight: 1.05 },
      { text: "typography for the glitching age", fontSize: 40, fontWeight: 300, align: "center", marginTop: 8 },
    ],
  },
  {
    title: "Aurora, heat bleed, tight smear",
    palette: "aurora",
    bleed: "heat",
    angle: 80,
    deform: { probability: 0.1, smearLength: 0.45, blur: 0.06, noise: 0.9 },
    blocks: [
      { text: "Pretext decides where every glyph goes; canvas decides what happens to it.", fontSize: 44, fontWeight: 400, lineHeight: 1.25 },
    ],
  },
  {
    title: "Sunset, long drips (deformation only in the first block)",
    palette: "sunset",
    bleed: "prism",
    angle: 55,
    deform: { probability: 0.18, smearLength: 1.5, intensity: 1.2 },
    blocks: [
      { text: "Melting Serif", fontSize: 84, fontWeight: 500 },
      { text: "Body copy stays crisp when a block opts out of deformation.", fontSize: 30, marginTop: 16, deform: false },
    ],
  },
]

export default function DeformedPage() {
  const [seed, setSeed] = useState(3)
  const [deform, setDeform] = useState({ ...defaultDeform })
  const [gradientAngle, setGradientAngle] = useState(defaultGradient.angle)
  const [gradientCycle, setGradientCycle] = useState(defaultGradient.cycle)
  const [paletteName, setPaletteName] = useState<PaletteName>("cover")
  const [bleedName, setBleedName] = useState<BleedPaletteName>("prism")
  const [view, setView] = useState<ViewMode>("compare")

  const handleReshuffle = () => setSeed(Math.floor(Math.random() * 100000))

  const handleSliderChange = (key: SliderConfig["key"]) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setDeform((current) => ({ ...current, [key]: Number(event.target.value) }))

  const showOurs = view !== "reference"
  const showReference = view !== "ours"

  return (
    <main className="mx-auto flex max-w-[1800px] flex-col gap-6 p-6 lg:flex-row lg:flex-wrap">
      <aside className="flex w-full shrink-0 flex-col gap-5 lg:w-72" aria-label="Deformation controls">
        <header className="flex flex-col gap-1">
          <h1 className="text-lg font-medium text-neutral-100">Deformed text</h1>
          <p className="text-sm text-neutral-400">
            Pretext layout, per-glyph pastel gradient, prismatic smear on a few random glyphs.
          </p>
        </header>

        <div role="group" aria-label="View mode" className="flex gap-1">
          {viewModes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              tabIndex={0}
              aria-pressed={view === mode.id}
              onClick={() => setView(mode.id)}
              className="rounded border border-neutral-700 px-2 py-1 text-xs aria-pressed:bg-neutral-100 aria-pressed:text-black"
            >
              {mode.label}
            </button>
          ))}
        </div>

        <div className="flex items-end gap-2">
          <label className="flex flex-1 flex-col gap-1 text-xs text-neutral-400">
            Seed
            <input
              type="number"
              value={seed}
              onChange={(event) => setSeed(Number(event.target.value))}
              className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100"
            />
          </label>
          <button
            type="button"
            tabIndex={0}
            aria-label="Pick a new random seed"
            onClick={handleReshuffle}
            className="rounded border border-neutral-700 px-3 py-1 text-sm hover:bg-neutral-800"
          >
            Reshuffle
          </button>
        </div>

        {sliders.map((slider) => (
          <label key={slider.key} className="flex flex-col gap-1 text-xs text-neutral-400">
            <span className="flex justify-between">
              {slider.label}
              <span className="tabular-nums text-neutral-200">{deform[slider.key].toFixed(3)}</span>
            </span>
            <input
              type="range"
              min={slider.min}
              max={slider.max}
              step={slider.step}
              value={deform[slider.key]}
              onChange={handleSliderChange(slider.key)}
            />
          </label>
        ))}

        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          <span className="flex justify-between">
            Gradient angle
            <span className="tabular-nums text-neutral-200">{gradientAngle}°</span>
          </span>
          <input type="range" min={0} max={90} value={gradientAngle} onChange={(e) => setGradientAngle(Number(e.target.value))} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          <span className="flex justify-between">
            Gradient cycle (× width)
            <span className="tabular-nums text-neutral-200">{gradientCycle.toFixed(2)}</span>
          </span>
          <input type="range" min={0.3} max={3} step={0.05} value={gradientCycle} onChange={(e) => setGradientCycle(Number(e.target.value))} />
        </label>

        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          Gradient palette
          <select
            value={paletteName}
            onChange={(event) => setPaletteName(event.target.value as PaletteName)}
            className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100"
          >
            {Object.keys(palettes).map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          Bleed colours
          <select
            value={bleedName}
            onChange={(event) => setBleedName(event.target.value as BleedPaletteName)}
            className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100"
          >
            {Object.keys(bleedPalettes).map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
      </aside>

      <section className="flex flex-wrap gap-6" aria-label="Cover preview">
        {showOurs && (
          <Cover label="DeformedText">
            <div className="absolute" style={{ left: COVER_PADDING_X, top: 102, width: COVER_WIDTH - COVER_PADDING_X * 2 }}>
              <DeformedText
                blocks={coverBlocks}
                fontFamily={FONT_FAMILY}
                seed={seed}
                deform={{ ...deform, bleedColors: bleedPalettes[bleedName] }}
                gradient={{ stops: palettes[paletteName], angle: gradientAngle, cycle: gradientCycle }}
                className="w-full"
              />
            </div>
          </Cover>
        )}
        {showReference && (
          <Cover label="Reference">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/reference/cover.jpg" alt="Reference book cover" width={COVER_WIDTH} height={COVER_HEIGHT} />
          </Cover>
        )}
      </section>

      <section className="flex w-full flex-col gap-6 lg:basis-full" aria-label="Variants">
        <h2 className="text-sm uppercase tracking-widest text-neutral-500">Same API, different knobs</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {variants.map((variant, index) => (
            <figure key={variant.title} className="m-0 flex flex-col gap-3">
              <div className="overflow-hidden bg-black px-8 py-14">
                <DeformedText
                  blocks={variant.blocks}
                  fontFamily={FONT_FAMILY}
                  seed={seed + index}
                  deform={{ ...variant.deform, bleedColors: bleedPalettes[variant.bleed] }}
                  gradient={{ stops: palettes[variant.palette], angle: variant.angle, cycle: 0.6 }}
                  className="w-full"
                />
              </div>
              <figcaption className="text-xs text-neutral-500">{variant.title}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </main>
  )
}

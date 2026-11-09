# deformed-text

Renders text like a glitch-prism book cover: a light serif on black, a pastel
gradient that shifts across the glyphs, and a few randomly chosen glyphs per
block that are vertically smeared and blurred, with saturated red / blue /
yellow colour bleeding off them.

Line breaking and glyph positions come from `@chenglou/pretext`
(`prepareWithSegments` + `layoutWithLines`); painting is Canvas 2D.

Demo: `/deformed` (reference cover side by side, live knobs, extra variants).

## React

```tsx
import { DeformedText } from "@/lib/deformed-text"

<DeformedText
  fontFamily="var(--font-serif), Georgia, serif"
  seed={3}
  blocks={[
    { text: "The AGI Chronicles", fontSize: 74, fontWeight: 700, lineHeight: 1.2, maxWidth: 400 },
    { text: "The Inside Story of the Race to Create an Artificial Superintelligence", fontSize: 66, fontWeight: 400, marginTop: 97 },
    { text: "Kevin Roose", fontSize: 74, fontWeight: 700, marginTop: 104 },
  ]}
  deform={{ probability: 0.12, smearLength: 0.95, blur: 0.09, chromaticOffset: 0.035 }}
  gradient={{ stops: palettes.cover, angle: 70, cycle: 0.42 }}
/>
```

The canvas fills its wrapper's width (or pass `width`). The wrapper's height is
the text height; smears overflow it on purpose. The background is transparent
unless you pass `background`. `fontFamily` may be a `var(--font-x)` reference
(for `next/font`): it is resolved before measuring, and fonts are awaited with
`document.fonts.load` so pretext never caches fallback metrics.

## Imperative API

```ts
import {
  ensureFontsLoaded, layoutTextBlocks, planDeformations, paintDeformedText, renderDeformedText,
} from "@/lib/deformed-text"

// One call: layout + pick glyphs + size canvas + paint
await ensureFontsLoaded(blocks, family)
const { layout } = renderDeformedText(canvas, blocks, { width: 552, fontFamily: family, seed: "my-seed" })

// Or step by step
const layout = layoutTextBlocks(blocks, { width, fontFamily })   // pretext
planDeformations(layout, deformOptions, seed)                    // sets glyph.deform
paintDeformedText(ctx, layout, { deform, gradient, background, devicePixelRatio, bleed }, seed)
```

`layout.glyphs` exposes every glyph (`x`, `baseline`, `advance`, ink extents,
`deform`) so other renderers (SVG, WebGL) can reuse the layout and the plan.

## Knobs

`TextBlock`: `text`, `fontSize`, `lineHeight` (multiplier), `fontWeight`,
`fontStyle`, `fontFamily`, `marginTop`, `align`, `maxWidth`,
`deform` (partial overrides, or `false` to keep the block crisp), `gradient`.

`DeformOptions` (lengths in em, i.e. multiples of the block font size):

| option | meaning |
| --- | --- |
| `probability` | share of eligible glyphs that get deformed |
| `minPerBlock` / `maxPerBlock` | clamp on the count per block |
| `minGap` | minimum glyphs between two deformed glyphs |
| `eligible` | regex source a glyph must match (default lowercase letters) |
| `smearLength` | how far the colour streaks run |
| `blur` | blur radius of the bleed |
| `chromaticOffset` | horizontal split of the red / blue fringes |
| `noise` | drip wobble and scan-line banding, 0..1 |
| `intensity` | opacity of the saturated bleed |
| `directions` | any of `"up"`, `"down"`, `"both"`, picked per glyph |
| `cutRange` | where on the glyph height the smear is sampled (0 top, 1 bottom) |
| `bleedColors` | three saturated colours, ordered near to far from the glyph |
| `bodyRetention` | how much of the smeared-away half of the glyph survives |

`GradientOptions`: `stops` (looping pastel palette), `angle` (deg), `cycle`
(palette length as a fraction of layout width), `phase`, `noise` (per-glyph jitter).
Presets: `palettes` (`cover`, `rainbow`, `aurora`, `sunset`) and `bleedPalettes`
(`prism`, `neon`, `heat`).

## Seeds

Everything random derives from `seed` (number or string, see `createRng`).
Glyph ranking depends only on the seed, so raising `probability` adds glyphs
without reshuffling the ones already chosen, and moving sliders never changes
which glyphs are picked.

## How a deformed glyph is built

1. Draw the glyph to an offscreen canvas and pick a row at `cutFraction` of its ink height.
2. Stretch that row (and, for a shape-aware layer, the cut-away half) into a long
   streak, drift it sideways in segments, band it, and fade it out.
3. Tint the streak with a near-to-far ramp of the bleed colours, blur it twice
   (tight + halo) and composite it over the crisp upper half of the glyph, plus
   red / blue ghost copies of the body offset by `chromaticOffset`.

`ctx.filter` is used for blur; browsers without it fall back to a
down/up-scale blur.

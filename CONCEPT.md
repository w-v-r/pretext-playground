# Pretext Playground — Concept & Planning Document

## What Is Pretext?

[`@chenglou/pretext`](https://github.com/chenglou/pretext) is a pure JavaScript/TypeScript library for **multiline text measurement & layout**, by Cheng Lou (creator of React Motion, key contributor to Reason/ReScript).

It side-steps the browser's CSS layout engine entirely. Instead of relying on DOM measurements like `getBoundingClientRect` or `offsetHeight` (which trigger expensive layout reflows), pretext implements its own text measurement logic using the browser's font engine as ground truth only during a one-time `prepare()` step. After that, all layout is **pure arithmetic** — no DOM, no reflow, no paint.

### Core API Pattern

```ts
import { prepare, layout } from '@chenglou/pretext'

// One-time: analyze text, measure segments via canvas
const prepared = prepare('Some text here', '16px Inter')

// Hot path: pure arithmetic, no DOM
const { height, lineCount } = layout(prepared, 320, 20)
```

`prepare()` does the expensive work once: normalize whitespace, segment text, apply line-breaking rules, measure segments with canvas. `layout()` is cheap — pure math over cached widths. On resize, only re-run `layout()`.

### Rich Layout APIs

For manual line-by-line control, use `prepareWithSegments()` and the richer APIs:

- **`layoutWithLines()`** — all lines at a fixed width, with text content
- **`walkLineRanges()`** — iterate lines without building strings (for shrinkwrap, binary search)
- **`measureLineStats()`** — just line count + widest line width
- **`layoutNextLineRange()`** — route text one line at a time with variable widths per line
- **`materializeLineRange()`** — turn a range into actual text when needed

This last API is the creative powerhouse — it lets you flow text around arbitrary obstacles, change width per line, and render to canvas/SVG/WebGL.

### Rich Inline Text Helper

`@chenglou/pretext/rich-inline` handles mixed-font inline flow: code spans, mentions, chips, bold/italic runs — each with their own font and optional `extraWidth` for padding/borders.

```ts
import { prepareRichInline, walkRichInlineLineRanges, materializeRichInlineLineRange } from '@chenglou/pretext/rich-inline'

const prepared = prepareRichInline([
  { text: 'Ship ', font: '500 17px Inter' },
  { text: '@maya', font: '700 12px Inter', break: 'never', extraWidth: 22 },
  { text: "'s rich-note", font: '500 17px Inter' },
])
```

### What This Unlocks

Things that are impossible or extremely painful with CSS alone:

- **Text flowing around arbitrary shapes** (not just CSS floats — any geometry)
- **Variable-width lines** where each line has a different max width
- **Shrink-wrapping** multiline text to its tightest bounding box
- **DOM-free height prediction** for virtualization/occlusion
- **Rendering text to Canvas, SVG, or WebGL** with proper line breaking
- **Knuth-Plass paragraph justification** (demonstrated in their justification demo)
- **Real-time reflow** around animated obstacles (editorial engine demo)

### Cheng Lou's Philosophy (from `thoughts.md`)

> "If you dig deep enough, 80% of CSS spec could be avoided if userland had better control over text."

> "My personal desire is to see end-developers being empowered to make all the layouts that makes UI more expressive, without sacrificing maintainability & performance, and without having to wait for permissions from the web committee."

He sees pretext as a way to break out of the four UI stereotypes: landing pages, blog articles, SaaS dashboards, and mobile rectangles.

---

## Existing Demos (chenglou.me/pretext)

| Demo | Description |
|------|-------------|
| **Accordion** | Expand/collapse sections with pretext-calculated heights |
| **Bubbles** | Tight multiline message bubbles with less wasted area |
| **Dynamic Layout** | Fixed-height editorial spread with obstacle-aware title routing and continuous flow |
| **Variable Typographic ASCII** | Particle-driven ASCII art comparing proportional measured glyphs against monospace |
| **Editorial Engine** | Animated orbs, live text reflow, pull quotes, multi-column flow — zero DOM reads |
| **Justification Comparison** | CSS justification vs greedy hyphenation vs Knuth-Plass, side by side |
| **Rich Text** | Rich inline text, code spans, links, chips — pills stay whole, text wraps naturally |
| **Markdown Chat** | Virtualized chat using marked for parsing, rich-inline for paragraphs, pre-wrap for code |
| **Masonry** | Text-card occlusion where height comes from pretext, not DOM reads |

---

## Inspirations

### Douglas Hofstadter — *Gödel, Escher, Bach*

The central themes of GEB that map onto what pretext enables:

- **Strange Loops & Self-Reference**: Systems that, when followed through their levels, loop back on themselves. Text that can measure itself, describe itself, and rewrite itself based on its own layout creates exactly this kind of loop. The content depends on the layout, which depends on the content.

- **Formal Systems**: GEB opens with the MU Puzzle — a string rewriting system where you try (and fail) to derive "MU" from "MI" using four rules. This illustrates how meaning can emerge from mechanical rules, and how some truths are unreachable within a system.

- **Tangled Hierarchies**: The idea that "levels" in a system (e.g., author vs. character, code vs. text, container vs. content) can fold back on each other. Pretext lets text be simultaneously content *and* its own layout engine — a tangled hierarchy.

- **The Crab Canon**: A dialogue in GEB that reads the same forwards and backwards (like Bach's Crab Canon). Self-symmetry as a structural device.

- **Fugues & Counterpoint**: Multiple voices carrying independent but interlocking themes. Multi-column text flowing around shared obstacles is a typographic fugue.

### Philip Ball — *The Self-Made Tapestry*

Ball's book explores how complex patterns emerge from simple rules in nature:

- **Reaction-Diffusion / Turing Patterns**: Spots, stripes, and labyrinths that emerge from two interacting chemicals. These could serve as dynamic obstacles that text flows around — the text describes the very patterns it's being shaped by.

- **Branching & Fractal Growth**: Trees, rivers, lightning, lungs — branching structures that follow simple growth rules. Text could flow along branches, or branch itself.

- **Emergence**: The core idea that complex structure arises from local rules without central coordination. Pretext's line-by-line layout API is essentially a generative system — you feed it constraints, and structure emerges.

- **Self-Organization**: Patterns that maintain and reproduce themselves. A page that re-organizes its own layout based on what it's currently displaying.

---

## Project Ideas

### Idea 1: "This Sentence Is About Itself" — Self-Referential Text ⭐ START HERE

A page where text describes its own typographic properties in real-time, using pretext's measurement APIs. The text *measures itself* and reports its own state.

**Core mechanics:**
- Sentences contain live measurements: "This paragraph is **{lineCount}** lines tall and **{height}px** high."
- "The widest line in this block is **{maxLineWidth}px** wide."
- "If you make your window 50px narrower, I will become **{newLineCount}** lines instead."
- Resize the window and watch the text rewrite itself — the numbers change, which changes the text length, which can change the line count, which changes the numbers...

**The strange loop:** The text's content depends on its layout, but the layout depends on the content (because the numbers are part of the text). This creates a genuine fixed-point problem — the system must converge to a state where the text accurately describes itself. Sometimes it won't converge (oscillation), which is itself interesting and Gödelian.

**Implementation approach:**
1. Use `prepareWithSegments()` + `measureLineStats()` to measure the text
2. Inject the measurements back into the text as template values
3. Re-measure with the new text
4. Iterate until convergence (or detect oscillation)
5. Render via DOM with pretext-calculated positioning, or canvas

**Bonus elements:**
- A "liar's paragraph" that claims to be a different number of lines than it actually is — and visually demonstrates the contradiction
- Hovering over a measurement highlights the thing being measured
- A toggle that breaks the self-reference and shows what happens

---

### Idea 2: "The Self-Made Tapestry" — Text Flowing Around Emergent Patterns

A canvas-rendered page combining Philip Ball's pattern formation with pretext's obstacle-aware text flow.

**Core mechanics:**
- A reaction-diffusion simulation (Gray-Scott model) runs on a canvas, producing evolving Turing patterns
- Text from Ball's own writing about pattern formation flows around the patterns
- As the patterns evolve, text reflows in real-time using `layoutNextLineRange()` with variable widths
- The text literally describes what it's being shaped by

**The meta-layer:** The content (Ball describing emergence) is being *demonstrated* by its own layout (text structure emerging from simple rules).

**Implementation approach:**
1. Run Gray-Scott reaction-diffusion on an offscreen canvas
2. For each text line's Y position, scan the pattern to determine available width
3. Use `layoutNextLineRange()` with those per-line widths
4. Render text to a visible canvas, overlaying the pattern

---

### Idea 3: "MU Puzzle" — Interactive Formal System

From GEB Chapter 1. An interactive derivation explorer.

**Core mechanics:**
- Start with the axiom string "MI"
- Four transformation rules are displayed and clickable
- Each derivation step is laid out by pretext in a flowing column
- The derivation tree branches and grows as you explore
- Text reflows as the tree grows — pretext handles all height/width calculation
- You can try (and fail) to derive "MU"

**The pedagogical hook:** The player discovers incompleteness by playing — no amount of rule-following can produce "MU" from "MI", because the number of I's can never be a multiple of 3.

---

### Idea 4: "Crab Canon" — Palindromic Text Layout

A piece of text rendered simultaneously forward and backward, meeting in the middle.

**Core mechanics:**
- The same prepared text is laid out twice: top-down and bottom-up
- They meet at a midpoint, forming a visual palindrome
- Pretext's segment-level access lets us reverse at the segment (not character) level
- The forward reading tells one story; the backward reading reveals a shadow meaning

---

### Idea 5: "Fugue" — Multi-Voice Text Counterpoint

Multiple columns of text that interleave and respond to each other, like voices in a Bach fugue.

**Core mechanics:**
- 2-4 columns of text, each a different "voice"
- Shared obstacles that all voices must flow around
- When one voice discusses a concept, the other voices respond typographically (e.g., their text tightens, expands, or reflows)
- Pull quotes bridge between columns

---

## Technical Stack

- **Next.js** with TypeScript
- **`@chenglou/pretext`** for all text measurement and layout
- **Tailwind CSS** for page-level styling (ironic, given Cheng Lou's CSS philosophy, but practical for the shell)
- **Canvas 2D** for demos that need pixel-level text rendering
- **React** for the interactive UI shell and state management

---

## Build Order

1. **Self-Referential Text** (Idea 1) — warm-up, exercises core APIs, immediately compelling
2. **Self-Made Tapestry** (Idea 2) — ambitious, combines simulation with text flow
3. **MU Puzzle** (Idea 3) — interactive, pedagogical, different kind of challenge
4. Further ideas as inspiration strikes

---

## References

- [Pretext GitHub](https://github.com/chenglou/pretext)
- [Pretext Demos](https://chenglou.me/pretext/)
- [Pretext npm](https://www.npmjs.com/package/@chenglou/pretext)
- Hofstadter, D. R. (1979). *Gödel, Escher, Bach: An Eternal Golden Braid*
- Ball, P. (1999). *The Self-Made Tapestry: Pattern Formation in Nature*

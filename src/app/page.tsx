"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { prepareWithSegments, measureLineStats } from "@chenglou/pretext"

const FONT = '18px Georgia'
const LINE_HEIGHT = 28

type Metrics = {
  lineCount: number
  maxLineWidth: number
  charCount: number
  wordCount: number
}

const solve = (
  buildText: (m: Metrics) => string,
  font: string,
  width: number,
): { text: string; metrics: Metrics; iterations: number } => {
  let metrics: Metrics = { lineCount: 1, maxLineWidth: 0, charCount: 0, wordCount: 0 }
  let prev = ""

  for (let i = 0; i < 20; i++) {
    const text = buildText(metrics)
    if (text === prev) return { text, metrics, iterations: i }

    const prepared = prepareWithSegments(text, font)
    const stats = measureLineStats(prepared, width)
    metrics = {
      lineCount: stats.lineCount,
      maxLineWidth: stats.maxLineWidth,
      charCount: text.length,
      wordCount: text.split(/\s+/).filter(Boolean).length,
    }
    prev = text
  }

  return { text: prev, metrics, iterations: 20 }
}

const Metric = ({ children }: { children: React.ReactNode }) => (
  <span className="font-mono text-accent tabular-nums">{children}</span>
)

const LiveBlock = ({
  buildText,
}: {
  buildText: (m: Metrics) => string
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const [result, setResult] = useState<{ text: string; metrics: Metrics; iterations: number } | null>(null)

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    const width = el.clientWidth
    if (width <= 0) return
    setResult(solve(buildText, FONT, width))
  }, [buildText])

  useEffect(() => {
    measure()
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => requestAnimationFrame(measure))
    ro.observe(el)
    return () => ro.disconnect()
  }, [measure])

  const parts = result?.text.split(/«(\w+):([^»]+)»/) ?? []
  const rendered: React.ReactNode[] = []
  for (let i = 0; i < parts.length; i += 3) {
    if (parts[i]) rendered.push(parts[i])
    if (parts[i + 2] !== undefined) {
      rendered.push(<Metric key={i}>{parts[i + 2]}</Metric>)
    }
  }

  return (
    <div
      ref={ref}
      className="text-lg leading-relaxed"
      style={{ fontFamily: "Georgia, serif", lineHeight: `${LINE_HEIGHT}px` }}
    >
      {rendered}
    </div>
  )
}

const block1 = (m: Metrics): string => {
  const lines = m.lineCount || 1
  const width = Math.round(m.maxLineWidth) || 0
  const chars = m.charCount || 0
  return `This sentence is occupying «lines:${lines}» line${lines !== 1 ? "s" : ""} right now. The widest of ${lines === 1 ? "it" : "them"} stretches «width:${width}» pixels across your screen. The whole thing is «chars:${chars}» characters long, which is part of why it takes up exactly that much space — but of course, the number of characters just changed because I told you about it.`
}

const block2 = (m: Metrics): string => {
  const lines = m.lineCount || 1
  const words = m.wordCount || 0
  const linesWord = lines === 1 ? "one line" : lines === 2 ? "two lines" : lines === 3 ? "three lines" : lines === 4 ? "four lines" : lines === 5 ? "five lines" : `${lines} lines`
  return `I am a paragraph that is exactly «lines:${linesWord}» long. I know this because I measured myself before you read me. I contain «words:${words}» words. If you were to make your window narrower, I would become longer, and these numbers would change, and my claim about myself would still be true. This is either a miracle of self-knowledge, or a parlor trick involving a fixed-point iteration. Hofstadter would call it a strange loop.`
}

const block3 = (m: Metrics): string => {
  const lines = m.lineCount || 1
  const narrow = lines + 1
  const wide = Math.max(1, lines - 1)
  return `The sentence you are reading wraps into «lines:${lines}» line${lines !== 1 ? "s" : ""}. If your window were narrower, it would become «narrow:${narrow}». If wider, probably «wide:${wide}». Each prediction changes the text, which changes the measurement, which changes the prediction. The system must find a fixed point — a number that remains true even after it has been spoken aloud. Not every self-referential claim has one.`
}

const Home = () => {
  return (
    <div className="px-6 py-16 sm:px-12 lg:px-20">
      
      <header className="mb-24">
        <h1 className="text-4xl font-semibold tracking-tight leading-tight mb-4">
        Pretext Playground
        </h1>
        <hr className="border-t border-border mb-8" />
        <p className="text-base text-muted leading-relaxed max-w-lg">
          Each paragraph below uses pretext to measure itself, then writes its own
          measurements into its content. Resize your browser window — the text
          reflows, the numbers update, and the loop runs again.
        </p>
      </header>

      <div className="flex flex-col gap-16">
        <section>
          <h2 className="text-xs font-mono text-muted uppercase tracking-widest mb-4">
            I. The Self-Measuring Sentence
          </h2>
          <LiveBlock buildText={block1} />
        </section>

        <section>
          <h2 className="text-xs font-mono text-muted uppercase tracking-widest mb-4">
            II. The Self-Knowing Paragraph
          </h2>
          <LiveBlock buildText={block2} />
        </section>

        <section>
          <h2 className="text-xs font-mono text-muted uppercase tracking-widest mb-4">
            III. The Predictive Paragraph
          </h2>
          <LiveBlock buildText={block3} />
        </section>
      </div>
      

      <footer className="mt-24 border-t border-border pt-8 text-sm text-muted">
        <p>

          
          Text measured with{" "}
          <a
            href="https://github.com/chenglou/pretext"
            className="text-accent hover:underline"
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={0}
            aria-label="Pretext GitHub repository"
          >
            @chenglou/pretext
          </a>
          {""}.
        </p>
      </footer>
    </div>
  )
}

export default Home

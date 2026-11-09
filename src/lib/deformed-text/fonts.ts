import { buildFont } from "./layout"
import type { TextBlock } from "./types"

/** Resolves `var(--font-x)` style values (e.g. from next/font) into a real family list. */
export const resolveFontFamily = (element: HTMLElement, family: string): string => {
  if (!family.includes("var(")) return family
  const probe = document.createElement("span")
  probe.style.fontFamily = family
  probe.style.position = "absolute"
  probe.style.visibility = "hidden"
  element.appendChild(probe)
  const resolved = getComputedStyle(probe).fontFamily
  probe.remove()
  return resolved
}

/** Waits until every font used by the blocks is available to canvas and pretext. */
export const ensureFontsLoaded = async (blocks: TextBlock[], fontFamily: string): Promise<void> => {
  const requests = new Map<string, string>()
  blocks.forEach((block) => {
    const font = buildFont(block, fontFamily)
    requests.set(font, `${requests.get(font) ?? ""}${block.text}`)
  })
  // Fallback faces declared with local() reject when the machine lacks them; that is fine.
  await Promise.allSettled(Array.from(requests, ([font, text]) => document.fonts.load(font, text)))
  await document.fonts.ready
}

import { clamp, lerp } from "./random"

export type RGB = [number, number, number]

export const parseColor = (color: string): RGB => {
  const hex = color.trim().replace("#", "")
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex
  const value = parseInt(full, 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

export const rgbToCss = ([r, g, b]: RGB, alpha = 1) =>
  `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`

/** Samples a looping palette at `t` (any real number, wraps every 1). */
export const samplePalette = (stops: RGB[], t: number): RGB => {
  const wrapped = t - Math.floor(t)
  const scaled = wrapped * stops.length
  const index = Math.floor(scaled)
  const from = stops[index % stops.length]
  const to = stops[(index + 1) % stops.length]
  const mix = scaled - index
  return [lerp(from[0], to[0], mix), lerp(from[1], to[1], mix), lerp(from[2], to[2], mix)]
}

export const mixRgb = (from: RGB, to: RGB, amount: number): RGB => [
  lerp(from[0], to[0], amount),
  lerp(from[1], to[1], amount),
  lerp(from[2], to[2], amount),
]

export const scaleRgb = (color: RGB, amount: number): RGB => [
  clamp(color[0] * amount, 0, 255),
  clamp(color[1] * amount, 0, 255),
  clamp(color[2] * amount, 0, 255),
]

export const palettes = {
  cover: ["#8fd6ff", "#fff0d2", "#ff9fd2", "#ffee55", "#fff0d2"],
  rainbow: ["#ff9db8", "#ffd39a", "#fff59a", "#a9f0b4", "#9bdcff", "#c4b0ff"],
  aurora: ["#8ff0d2", "#9bc4ff", "#d6a8ff", "#ffb3d9", "#c8f5ff"],
  sunset: ["#ffd6a5", "#ffadad", "#ffc6ff", "#bdb2ff", "#fdffb6"],
} as const

export type PaletteName = keyof typeof palettes

export const bleedPalettes = {
  prism: ["#1f4dff", "#ff2a2a", "#ffd21a"],
  neon: ["#00d0ff", "#ff1f8e", "#b6ff1a"],
  heat: ["#ff3b1f", "#ff9a1f", "#ffe11a"],
} as const

export type BleedPaletteName = keyof typeof bleedPalettes

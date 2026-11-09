export type Rng = () => number

export const hashString = (input: string): number => {
  let hash = 2166136261
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export const toSeedNumber = (seed: number | string): number =>
  typeof seed === "number" ? seed >>> 0 : hashString(seed)

export const createRng = (seed: number | string): Rng => {
  let state = toSeedNumber(seed) || 1
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let mixed = Math.imul(state ^ (state >>> 15), state | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

export const hashToUnit = (seed: number, salt: number): number =>
  createRng((seed ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0)()

const smoothstep = (t: number) => t * t * (3 - 2 * t)

/** Smooth 1D value noise in [-1, 1]. */
export const noise1d = (seed: number, x: number): number => {
  const cell = Math.floor(x)
  const fraction = smoothstep(x - cell)
  const a = hashToUnit(seed, cell) * 2 - 1
  const b = hashToUnit(seed, cell + 1) * 2 - 1
  return a + (b - a) * fraction
}

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export const lerp = (from: number, to: number, t: number) => from + (to - from) * t

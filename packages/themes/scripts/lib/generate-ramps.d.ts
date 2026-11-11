export const RAMP_HUES: readonly [
  'neutral',
  'primary',
  'success',
  'warning',
  'danger',
  'info',
]
export const RAMP_STEPS: readonly number[]
export const RAMP_MODES: readonly ['light', 'dark']
export const LIGHTNESS_CURVES: { light: number[]; dark: number[] }
export const CHROMA_CURVES: { light: number[]; dark: number[] }

export function generateHueRamp(
  seedHex: string,
  options: { mode: 'light' | 'dark'; anchor: number; hueShift?: number },
): Record<string, string>

export function generateRampDocument(seeds: unknown): Record<string, unknown>

export function rampTokenName(
  hue: string,
  mode: 'light' | 'dark',
  step: number,
): string

export function oklchOf(hex: string): { l: number; c: number; h: number }

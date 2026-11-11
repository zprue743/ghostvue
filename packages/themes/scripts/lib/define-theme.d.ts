import type { CompiledToken, TokenManifest } from './compile-tokens.js'

/** OKLCH hue in `[0, 360]` (`360` ≡ `0`), or a parseable sRGB/OKLCH/HSL CSS color. */
export type ColorSeed = number | string

export type ThemeDensity = 'compact' | 'comfortable' | 'spacious'
export type ElevationFlavor = 'subtle' | 'standard' | 'dramatic'
export type GradientFlavor = 'none' | 'subtle' | 'aurora'

export interface DefineThemeInput {
  /** `data-sl-theme` value. Kebab-case. Not `default`. */
  name: string
  primary: ColorSeed
  /** Neutral hue/color, or the string `'none'` for chroma 0. Default: primary hue, low chroma. */
  neutralTint?: ColorSeed
  /** Defaults: current `default` theme status seeds (not derived from primary). */
  status?: {
    success?: ColorSeed
    warning?: ColorSeed
    danger?: ColorSeed
    info?: ColorSeed
  }
  /** `0` sharp → `1` designed (including pill). Default `1`. */
  roundness?: number
  /** Unset `data-sl-density` under this theme. Default `'comfortable'`. */
  density?: ThemeDensity
  /** Unitless duration scale. Default `1`. */
  motionIntensity?: number
  /** Shadow/lift recipe. Default `'standard'`. */
  elevation?: ElevationFlavor
  /** `gradient.accent` / aurora recipe. Default `'subtle'`. */
  gradient?: GradientFlavor
}

export interface DefinedTheme {
  name: string
  css: string
  tokens: TokenManifest['tokens']
  manifest: TokenManifest
}

export type FlagshipThemeName = 'calm' | 'vibrant' | 'mono'

export const flagshipThemes: readonly FlagshipThemeName[]

export const FLAGSHIP_THEME_INPUTS: readonly DefineThemeInput[]

export class DefineThemeError extends Error {
  name: 'DefineThemeError'
}

export function applyContrastAdjustments(
  tokens: CompiledToken[],
): CompiledToken[]

export function defineTheme(input: DefineThemeInput): DefinedTheme

export const WCAG_AA_NORMAL_TEXT: number
export const TOKEN_MODES: readonly ['light', 'dark']

export interface ContrastPair {
  fg: string
  bg: string
  reason: string
}

export interface ContrastResult extends ContrastPair {
  mode: 'light' | 'dark'
  fgValue: string
  bgValue: string
  wcag: number
  apca: number
  passesWcagAa: boolean
}

export function isHexColor(value: unknown): value is string

export function contrastPairs(
  tokens: { name: string; tier: string; type: string }[],
): ContrastPair[]

export function evaluateContrast(
  tokens: {
    name: string
    tier: string
    type: string
    value: { light: string; dark: string }
  }[],
): ContrastResult[]

export function formatContrastReport(results: ContrastResult[]): string

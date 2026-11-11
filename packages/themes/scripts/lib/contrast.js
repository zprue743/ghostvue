import { wcagContrast } from 'culori'

import { apcaContrast } from './apca.js'

export const WCAG_AA_NORMAL_TEXT = 4.5
export const TOKEN_MODES = ['light', 'dark']

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

export function isHexColor(value) {
  return typeof value === 'string' && HEX.test(value)
}

/**
 * Semantic text/background pairs that must meet WCAG 2 AA.
 * Includes `text.*` on the canvas and every `*.fg` with a matching `*.bg`
 * (plus hover/active backgrounds).
 *
 * @param {{ name: string, tier: string, type: string }[]} tokens
 */
export function contrastPairs(tokens) {
  const names = new Set(tokens.map((token) => token.name))
  const pairs = []
  const seen = new Set()

  const add = (fg, bg, reason) => {
    const key = `${fg} on ${bg}`
    if (seen.has(key) || !names.has(fg) || !names.has(bg)) return
    seen.add(key)
    pairs.push({ fg, bg, reason })
  }

  add('surface.fg', 'surface.bg', 'surface')
  add('surface.inverse.fg', 'surface.inverse.bg', 'surface')

  for (const token of tokens) {
    if (token.tier !== 'semantic' || token.type !== 'color') continue
    const { name } = token

    if (name.startsWith('text.') && name !== 'text.inverse') {
      add(name, 'surface.bg', 'text on canvas')
    }
    if (name === 'text.inverse') {
      add(name, 'surface.inverse.bg', 'inverse text')
    }

    if (name.endsWith('.fg')) {
      const stem = name.slice(0, -3)
      add(name, `${stem}.bg`, 'fg/bg')
      add(name, `${stem}.bg.hover`, 'fg/bg')
      add(name, `${stem}.bg.active`, 'fg/bg')
    }

    if (/^elevation\.\d+\.bg$/.test(name)) {
      add('surface.fg', name, 'text on elevation')
      add('text.default', name, 'text on elevation')
      add('text.muted', name, 'text on elevation')
      add('text.subtle', name, 'text on elevation')
    }
  }

  add('surface.fg', 'material.glass.fallback.bg', 'text on glass fallback')
  add('text.default', 'material.glass.fallback.bg', 'text on glass fallback')
  add('text.muted', 'material.glass.fallback.bg', 'text on glass fallback')
  add('text.subtle', 'material.glass.fallback.bg', 'text on glass fallback')
  add('surface.fg', 'material.solid.bg', 'text on solid material')
  add('text.default', 'material.solid.bg', 'text on solid material')
  add('surface.fg', 'material.grain.bg', 'text on grain')
  add('text.default', 'material.grain.bg', 'text on grain')

  return pairs.sort(
    (left, right) =>
      left.fg.localeCompare(right.fg) || left.bg.localeCompare(right.bg),
  )
}

/**
 * @param {{ name: string, tier: string, type: string, value: { light: string, dark: string } }[]} tokens
 */
export function evaluateContrast(tokens) {
  const byName = new Map(tokens.map((token) => [token.name, token]))
  const results = []

  for (const pair of contrastPairs(tokens)) {
    const fgToken = byName.get(pair.fg)
    const bgToken = byName.get(pair.bg)
    if (!fgToken || !bgToken) continue

    for (const mode of TOKEN_MODES) {
      const fgValue = fgToken.value[mode]
      const bgValue = bgToken.value[mode]
      if (!isHexColor(fgValue) || !isHexColor(bgValue)) continue
      const wcag = wcagContrast(fgValue, bgValue)
      const apca = apcaContrast(fgValue, bgValue)
      results.push({
        ...pair,
        mode,
        fgValue,
        bgValue,
        wcag,
        apca,
        passesWcagAa: wcag >= WCAG_AA_NORMAL_TEXT,
      })
    }
  }

  return results
}

export function formatContrastReport(results) {
  const header =
    `Checked ${String(results.length)} semantic contrast pairs ` +
    `(WCAG 2 AA ${String(WCAG_AA_NORMAL_TEXT)}:1 required; APCA Lc advisory).`
  const rows = results.map((row) => {
    const status = row.passesWcagAa ? 'pass' : 'FAIL'
    const wcag = row.wcag.toFixed(2).padStart(5)
    const lc = row.apca.toFixed(1).padStart(7)
    return `${status}  ${row.mode.padEnd(5)}  ${row.fg} on ${row.bg}  WCAG ${wcag}  Lc ${lc}`
  })
  return [header, '', ...rows].join('\n')
}

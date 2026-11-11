/**
 * APCA (Accessible Perceptual Contrast Algorithm) 0.0.98G-4g, the W3
 * candidate constants last changed 15 Feb 2021.
 *
 * https://github.com/Myndex/apca-w3 — this is a small local port of the
 * sRGBtoY + APCAcontrast pair, not a dependency. Do not add an `apca`
 * package. Lc is advisory in this repo; WCAG 2 contrast is the gate.
 *
 * Polarity is significant: dark text on a light background is positive;
 * light text on a dark background is negative. Do not abs() the result
 * when reporting.
 */

/** @typedef {{ mainTRC: number, sRco: number, sGco: number, sBco: number, normBG: number, normTXT: number, revTXT: number, revBG: number, blkThrs: number, blkClmp: number, scaleBoW: number, scaleWoB: number, loBoWoffset: number, loWoBoffset: number, deltaYmin: number, loClip: number }} ApcaConstants */

/** APCA 0.0.98G-4g sRGB constants (W3 candidate). */
export const APCA_SA98G = {
  mainTRC: 2.4,
  sRco: 0.2126729,
  sGco: 0.7151522,
  sBco: 0.072175,
  normBG: 0.56,
  normTXT: 0.57,
  revTXT: 0.62,
  revBG: 0.65,
  blkThrs: 0.022,
  blkClmp: 1.414,
  scaleBoW: 1.14,
  scaleWoB: 1.14,
  loBoWoffset: 0.027,
  loWoBoffset: 0.027,
  deltaYmin: 0.0005,
  loClip: 0.1,
}

function parseHexColor(color) {
  const match = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!match) {
    throw new Error(`APCA expected a #hex color, got "${color}"`)
  }
  let hex = match[1]
  if (hex.length === 3) {
    hex = [...hex].map((digit) => `${digit}${digit}`).join('')
  }
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ]
}

function softClampY(y, constants) {
  return y > constants.blkThrs
    ? y
    : y + (constants.blkThrs - y) ** constants.blkClmp
}

/**
 * Convert an sRGB hex color to APCA luminance Y.
 *
 * @param {string} color
 * @param {ApcaConstants} [constants]
 */
export function srgbToY(color, constants = APCA_SA98G) {
  const [red, green, blue] = parseHexColor(color)
  const linearize = (channel) => (channel / 255) ** constants.mainTRC
  return (
    constants.sRco * linearize(red) +
    constants.sGco * linearize(green) +
    constants.sBco * linearize(blue)
  )
}

/**
 * Signed APCA Lc (lightness contrast) for text on a background.
 *
 * @param {string} textHex
 * @param {string} backgroundHex
 * @param {ApcaConstants} [constants]
 * @returns {number}
 */
export function apcaContrast(textHex, backgroundHex, constants = APCA_SA98G) {
  let textY = srgbToY(textHex, constants)
  let backgroundY = srgbToY(backgroundHex, constants)

  if (
    Number.isNaN(textY) ||
    Number.isNaN(backgroundY) ||
    Math.min(textY, backgroundY) < 0 ||
    Math.max(textY, backgroundY) > 1.1
  ) {
    return 0
  }

  textY = softClampY(textY, constants)
  backgroundY = softClampY(backgroundY, constants)

  if (Math.abs(backgroundY - textY) < constants.deltaYmin) {
    return 0
  }

  if (backgroundY > textY) {
    const sapc =
      (backgroundY ** constants.normBG - textY ** constants.normTXT) *
      constants.scaleBoW
    const contrast = sapc < constants.loClip ? 0 : sapc - constants.loBoWoffset
    return contrast * 100
  }

  const sapc =
    (backgroundY ** constants.revBG - textY ** constants.revTXT) *
    constants.scaleWoB
  const contrast = sapc > -constants.loClip ? 0 : sapc + constants.loWoBoffset
  return contrast * 100
}

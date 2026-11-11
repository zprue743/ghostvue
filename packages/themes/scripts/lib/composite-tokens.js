/**
 * DTCG composite $value helpers for shadow, gradient, cubicBezier, and spring
 * tokens.
 *
 * Shadows follow the Design Tokens Community Group `shadow` type (a layer or
 * an array of layers). Gradients accept DTCG color-stop lists plus a small
 * layered extension so aurora can be several `radial-gradient(in oklch, …)`
 * functions in one token. cubicBezier is the DTCG array of four numbers.
 * Springs are mass-spring-damper params compiled to CSS `linear()`. Resolved
 * composites serialize to CSS strings so the public catalog stays
 * string-valued like scalar tokens.
 */

import {
  isSpringValue,
  serializeSpringDuration,
  serializeSpringEasing,
} from './spring.js'

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isCubicBezierValue(value) {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every((entry) => typeof entry === 'number' && Number.isFinite(entry))
  )
}

export function serializeCubicBezier(value) {
  if (!isCubicBezierValue(value)) {
    throw new Error('cubicBezier tokens require four finite numbers')
  }
  return `cubic-bezier(${value.join(', ')})`
}

export function isShadowLayer(value) {
  return (
    isPlainObject(value) &&
    value.offsetX != null &&
    value.offsetY != null &&
    value.blur != null &&
    value.color != null
  )
}

export function isShadowValue(value) {
  if (isShadowLayer(value)) return true
  return Array.isArray(value) && value.length > 0 && value.every(isShadowLayer)
}

export function isGradientStop(value) {
  return isPlainObject(value) && value.color != null
}

export function isGradientLayer(value) {
  return (
    isPlainObject(value) &&
    Array.isArray(value.stops) &&
    value.stops.length > 0 &&
    value.stops.every(isGradientStop)
  )
}

export function isGradientValue(value) {
  if (typeof value === 'string') return true
  if (isGradientLayer(value)) return true
  if (Array.isArray(value) && value.length > 0) {
    if (value.every(isGradientStop)) return true
    if (value.every(isGradientLayer)) return true
  }
  return false
}

export function isCompositeValue(value) {
  return (
    isShadowValue(value) ||
    isGradientValue(value) ||
    isCubicBezierValue(value) ||
    isSpringValue(value)
  )
}

function serializeShadowLayer(layer) {
  const inset = layer.inset === true ? 'inset ' : ''
  const spread =
    layer.spread == null || layer.spread === '' ? '0px' : String(layer.spread)
  return `${inset}${String(layer.offsetX)} ${String(layer.offsetY)} ${String(layer.blur)} ${spread} ${String(layer.color)}`
}

export function serializeShadow(value) {
  const layers = Array.isArray(value) ? value : [value]
  if (!layers.every(isShadowLayer)) {
    throw new Error('Shadow tokens require offsetX, offsetY, blur, and color')
  }
  return layers.map(serializeShadowLayer).join(', ')
}

function formatStopPosition(position) {
  if (position == null || position === '') return ''
  if (typeof position === 'number') {
    const percent = position >= 0 && position <= 1 ? position * 100 : position
    return `${String(Number(percent.toFixed(4)))}%`
  }
  return String(position)
}

function serializeStops(stops) {
  return stops
    .map((stop) => {
      const position = formatStopPosition(stop.position)
      return position ? `${String(stop.color)} ${position}` : String(stop.color)
    })
    .join(', ')
}

export function serializeGradientLayer(layer) {
  const interpolation = layer.interpolation || 'oklch'
  const style = layer.style || 'linear'
  const stops = serializeStops(layer.stops)
  if (style === 'radial') {
    const size = layer.size ? `${String(layer.size)} ` : ''
    const at = layer.at ? ` at ${String(layer.at)}` : ''
    return `radial-gradient(${size}in ${interpolation}${at}, ${stops})`
  }
  const angle = layer.angle ? `${String(layer.angle)} ` : ''
  return `linear-gradient(${angle}in ${interpolation}, ${stops})`
}

export function serializeGradient(value) {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && value.every(isGradientStop)) {
    return serializeGradientLayer({
      style: 'linear',
      interpolation: 'oklch',
      angle: '135deg',
      stops: value,
    })
  }
  if (isGradientLayer(value)) return serializeGradientLayer(value)
  if (Array.isArray(value) && value.every(isGradientLayer)) {
    return value.map(serializeGradientLayer).join(', ')
  }
  throw new Error('Unsupported gradient $value')
}

export function serializeComposite(type, value) {
  if (type === 'shadow') return serializeShadow(value)
  if (type === 'gradient') return serializeGradient(value)
  if (type === 'cubicBezier') return serializeCubicBezier(value)
  if (type === 'spring') return serializeSpringEasing(value)
  // A duration token may alias a spring; emit that spring's settle time.
  if (type === 'duration' && isSpringValue(value)) {
    return serializeSpringDuration(value)
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (typeof value === 'string') return value
  throw new Error(`Token type "${type}" resolved to a non-scalar value`)
}

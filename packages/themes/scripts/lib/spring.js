/**
 * Compiles a mass-spring-damper into a CSS `linear()` easing and a settle
 * duration. Runs at token compile time so the public catalog stays CSS strings
 * and no spring library ships to consumers.
 *
 * Displacement starts at 1 with rest at 0; easing is `1 - x(t)` so progress
 * runs 0 → 1 and underdamped springs may overshoot above 1.
 */

const SETTLE_DISPLACEMENT = 0.005
const SETTLE_VELOCITY = 0.01
const MAX_TIME_S = 2
const SAMPLE_HZ = 240
const SIMPLIFY_EPSILON = 0.004
const MAX_POINTS = 22

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isSpringValue(value) {
  return (
    isPlainObject(value) &&
    Number.isFinite(value.stiffness) &&
    Number.isFinite(value.damping) &&
    Number.isFinite(value.mass) &&
    value.stiffness > 0 &&
    value.mass > 0 &&
    value.damping >= 0
  )
}

function naturalFrequency(stiffness, mass) {
  return Math.sqrt(stiffness / mass)
}

function dampingRatio(stiffness, damping, mass) {
  return damping / (2 * Math.sqrt(stiffness * mass))
}

function displacementAt(time, stiffness, damping, mass) {
  const omega = naturalFrequency(stiffness, mass)
  const zeta = dampingRatio(stiffness, damping, mass)
  // x(0) = 1, v(0) = 0
  if (zeta < 1) {
    const omegaD = omega * Math.sqrt(1 - zeta * zeta)
    const decay = Math.exp(-zeta * omega * time)
    return (
      decay *
      (Math.cos(omegaD * time) +
        ((zeta * omega) / omegaD) * Math.sin(omegaD * time))
    )
  }
  if (Math.abs(zeta - 1) < 1e-9) {
    return (1 + omega * time) * Math.exp(-omega * time)
  }
  const omegaD = omega * Math.sqrt(zeta * zeta - 1)
  const root1 = -zeta * omega + omegaD
  const root2 = -zeta * omega - omegaD
  const amplitude1 = -root2 / (root1 - root2)
  const amplitude2 = root1 / (root1 - root2)
  return (
    amplitude1 * Math.exp(root1 * time) + amplitude2 * Math.exp(root2 * time)
  )
}

function velocityAt(time, stiffness, damping, mass) {
  const step = 1 / 8000
  return (
    (displacementAt(time + step, stiffness, damping, mass) -
      displacementAt(time, stiffness, damping, mass)) /
    step
  )
}

function perpendicularDistance(point, start, end) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSq = dx * dx + dy * dy
  if (lengthSq === 0) {
    const offsetX = point.x - start.x
    const offsetY = point.y - start.y
    return Math.hypot(offsetX, offsetY)
  }
  return (
    Math.abs(dy * point.x - dx * point.y + end.x * start.y - end.y * start.x) /
    Math.sqrt(lengthSq)
  )
}

function simplifyRdp(points, epsilon) {
  if (points.length < 3) return points
  const start = points[0]
  const end = points[points.length - 1]
  let maxDistance = 0
  let maxIndex = 0
  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = perpendicularDistance(points[index], start, end)
    if (distance > maxDistance) {
      maxDistance = distance
      maxIndex = index
    }
  }
  if (maxDistance <= epsilon) {
    return [start, end]
  }
  const left = simplifyRdp(points.slice(0, maxIndex + 1), epsilon)
  const right = simplifyRdp(points.slice(maxIndex), epsilon)
  return [...left.slice(0, -1), ...right]
}

function formatNumber(value) {
  const rounded = Math.round(value * 10_000) / 10_000
  if (Object.is(rounded, -0) || rounded === 0) return '0'
  return String(rounded)
}

function serializeLinear(points, durationS) {
  const stops = points.map((point, index) => {
    const value = formatNumber(point.value)
    if (index === 0 || index === points.length - 1) return value
    const percent = formatNumber((point.t / durationS) * 100)
    return `${value} ${percent}%`
  })
  return `linear(${stops.join(', ')})`
}

export function compileSpring(value) {
  if (!isSpringValue(value)) {
    throw new Error(
      'Spring tokens require positive stiffness, non-negative damping, and positive mass',
    )
  }
  const { stiffness, damping, mass } = value
  const dt = 1 / SAMPLE_HZ
  const samples = []
  let lastUnsettled = 0

  for (let time = 0; time <= MAX_TIME_S + dt / 2; time += dt) {
    const displacement = displacementAt(time, stiffness, damping, mass)
    const velocity = velocityAt(time, stiffness, damping, mass)
    samples.push({ t: time, value: 1 - displacement })
    if (
      Math.abs(displacement) >= SETTLE_DISPLACEMENT ||
      Math.abs(velocity) >= SETTLE_VELOCITY
    ) {
      lastUnsettled = time
    }
  }

  const durationS = Math.min(MAX_TIME_S, Math.max(dt, lastUnsettled + dt))
  const window = samples.filter((sample) => sample.t <= durationS + dt / 2)
  window[0].value = 0
  window[window.length - 1].value = 1
  window[window.length - 1].t = durationS

  const normalized = window.map((sample) => ({
    x: sample.t / durationS,
    y: sample.value,
    t: sample.t,
    value: sample.value,
  }))

  let simplified = simplifyRdp(normalized, SIMPLIFY_EPSILON)
  let epsilon = SIMPLIFY_EPSILON
  while (simplified.length > MAX_POINTS && epsilon < 0.05) {
    epsilon += 0.002
    simplified = simplifyRdp(normalized, epsilon)
  }
  if (simplified[0].value !== 0) simplified[0].value = 0
  simplified[simplified.length - 1].value = 1

  return {
    easing: serializeLinear(simplified, durationS),
    durationMs: Math.round(durationS * 1000),
    pointCount: simplified.length,
    samples: simplified.map((point) => ({ t: point.t, value: point.value })),
  }
}

export function serializeSpringEasing(value) {
  return compileSpring(value).easing
}

export function serializeSpringDuration(value) {
  return `${compileSpring(value).durationMs}ms`
}

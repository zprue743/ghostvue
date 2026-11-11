/** @vitest-environment node */

import { describe, expect, it } from 'vitest'

import { compileSpring } from '../../packages/themes/scripts/lib/spring.js'
import { tokens } from '../../packages/themes/src/generated/tokens'

const gentle = { stiffness: 280, damping: 33.47, mass: 1 }
const snappy = { stiffness: 520, damping: 28, mass: 1 }
const bouncy = { stiffness: 260, damping: 12, mass: 1 }

describe('spring linear() compilation', () => {
  it('snapshots generated linear() strings for the three presets', () => {
    expect(compileSpring(gentle).easing).toMatchInlineSnapshot(
      `"linear(0, 0.0191 2.1429%, 0.0866 5%, 0.4534 15.7143%, 0.6359 22.1429%, 0.767 28.5714%, 0.8204 32.1429%, 0.8698 36.4286%, 0.9065 40.7143%, 0.9369 45.7143%, 0.9751 57.1429%, 0.9934 72.8571%, 1)"`,
    )
    expect(compileSpring(snappy).easing).toMatchInlineSnapshot(
      `"linear(0, 0.0043 0.8264%, 0.036 2.4793%, 0.1271 4.9587%, 0.6578 14.876%, 0.8392 19.0083%, 0.9867 23.9669%, 1.0328 26.4463%, 1.063 28.9256%, 1.0832 32.2314%, 1.0853 36.3636%, 1.0164 52.8926%, 0.9952 62.8099%, 1)"`,
    )
    expect(compileSpring(bouncy).easing).toMatchInlineSnapshot(
      `"linear(0, 0.0336 1.3841%, 0.1536 3.1142%, 1.0771 11.7647%, 1.2198 14.1869%, 1.2801 16.609%, 1.2822 17.9931%, 1.259 19.7232%, 0.9889 28.7197%, 0.9437 31.1419%, 0.9209 33.91%, 0.9278 37.3702%, 1.0023 46.0208%, 1.0219 50.8651%, 1.0207 54.6713%, 0.9938 68.1661%, 1.0016 84.7751%, 1)"`,
    )
  })

  it('keeps a reasonable point count and distinct spring personalities', () => {
    const compiledGentle = compileSpring(gentle)
    const compiledSnappy = compileSpring(snappy)
    const compiledBouncy = compileSpring(bouncy)
    const gentleMax = Math.max(
      ...compiledGentle.samples.map((sample) => sample.value),
    )
    const snappyMax = Math.max(
      ...compiledSnappy.samples.map((sample) => sample.value),
    )
    const bouncyMax = Math.max(
      ...compiledBouncy.samples.map((sample) => sample.value),
    )

    expect(compiledGentle.pointCount).toBeLessThanOrEqual(22)
    expect(compiledSnappy.pointCount).toBeLessThanOrEqual(22)
    expect(compiledBouncy.pointCount).toBeLessThanOrEqual(22)
    expect(gentleMax).toBeLessThanOrEqual(1.001)
    expect(snappyMax).toBeGreaterThan(1.02)
    expect(bouncyMax).toBeGreaterThan(snappyMax)
    expect(compiledGentle.durationMs).toBeGreaterThan(300)
    expect(compiledSnappy.durationMs).toBeLessThan(compiledBouncy.durationMs)
  })

  it('publishes the same linear() strings on the semantic catalog', () => {
    expect(tokens['motion.spring.gentle'].value.light).toBe(
      compileSpring(gentle).easing,
    )
    expect(tokens['motion.spring.snappy'].value.light).toBe(
      compileSpring(snappy).easing,
    )
    expect(tokens['motion.spring.bouncy'].value.light).toBe(
      compileSpring(bouncy).easing,
    )
    expect(tokens['motion.spring.gentle.duration'].value.light).toBe(
      `${String(compileSpring(gentle).durationMs)}ms`,
    )
  })
})

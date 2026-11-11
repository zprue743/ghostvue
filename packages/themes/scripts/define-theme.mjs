/**
 * Tiny CLI over defineTheme. Writes one CSS file; not a second compiler.
 *
 * Usage: node scripts/define-theme.mjs --name acme --primary '#0f766e' --out acme.css
 */
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { defineTheme } from './lib/define-theme.js'

function readArg(args, flag) {
  const index = args.indexOf(flag)
  if (index === -1) return undefined
  return args[index + 1]
}

function maybeNumber(value) {
  if (value === undefined) return undefined
  const numeric = Number(value)
  return Number.isFinite(numeric) && value.trim() !== '' ? numeric : value
}

const args = process.argv.slice(2)
const name = readArg(args, '--name')
const primary = maybeNumber(readArg(args, '--primary'))
const out = readArg(args, '--out')
const roundness = maybeNumber(readArg(args, '--roundness'))
const density = readArg(args, '--density')
const motionIntensity = maybeNumber(readArg(args, '--motion-intensity'))
const elevation = readArg(args, '--elevation')
const gradient = readArg(args, '--gradient')
const neutralRaw = readArg(args, '--neutral-tint')
const neutralTint =
  neutralRaw === undefined
    ? undefined
    : neutralRaw === 'none'
      ? 'none'
      : maybeNumber(neutralRaw)

if (!name || primary === undefined || !out) {
  console.error(
    'Usage: node scripts/define-theme.mjs --name <kebab> --primary <hue|color> --out <file.css>',
  )
  process.exitCode = 1
} else {
  const theme = defineTheme({
    name,
    primary,
    ...(neutralTint !== undefined ? { neutralTint } : {}),
    ...(roundness !== undefined ? { roundness: Number(roundness) } : {}),
    ...(density ? { density } : {}),
    ...(motionIntensity !== undefined
      ? { motionIntensity: Number(motionIntensity) }
      : {}),
    ...(elevation ? { elevation } : {}),
    ...(gradient ? { gradient } : {}),
  })
  const outPath = resolve(out)
  await writeFile(outPath, theme.css)
  console.log(`Wrote ${outPath}`)
}

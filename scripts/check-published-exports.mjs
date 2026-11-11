import { readdir, readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Run after `pnpm build`. Vite empties `dist` before writing the Vue bundle,
// so declaration emit that happens first would otherwise vanish without
// failing verify.

const repositoryRoot = new URL('..', import.meta.url)
const packagesRoot = new URL('packages/', repositoryRoot)
const packageDirectories = await readdir(packagesRoot, {
  withFileTypes: true,
})

const violations = []

// Nested export conditions and fallback arrays are included so a missing
// `exports["."].types` file cannot hide behind a valid `import` path.
function collectRelativeTargets(value, acc = []) {
  if (typeof value === 'string') {
    if (value.startsWith('./') || value.startsWith('../')) {
      acc.push(value)
    }
    return acc
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      collectRelativeTargets(entry, acc)
    }
    return acc
  }

  if (value && typeof value === 'object') {
    for (const entry of Object.values(value)) {
      collectRelativeTargets(entry, acc)
    }
  }

  return acc
}

for (const directory of packageDirectories) {
  if (!directory.isDirectory()) continue

  const packageDirectory = resolve(fileURLToPath(packagesRoot), directory.name)
  const packageJsonPath = resolve(packageDirectory, 'package.json')
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'))
  const targets = [
    ...new Set(
      collectRelativeTargets({
        types: packageJson.types,
        typings: packageJson.typings,
        exports: packageJson.exports,
      }),
    ),
  ]

  if (targets.length === 0) {
    violations.push(
      `${packageJson.name} declares no types/exports file targets to verify`,
    )
    continue
  }

  // Library packages advertise TypeScript entry points. A missing `.d.ts`
  // target would make `exports.types` easy to delete instead of fixing emit.
  if (!targets.some((target) => target.endsWith('.d.ts'))) {
    violations.push(`${packageJson.name} has no .d.ts types/exports target`)
  }

  for (const target of targets) {
    const publishedFile = resolve(packageDirectory, target)

    try {
      const file = await stat(publishedFile)
      if (!file.isFile()) {
        violations.push(
          `${packageJson.name} published target is not a file: ${target}`,
        )
      }
    } catch {
      violations.push(`${packageJson.name} missing published file: ${target}`)
    }
  }
}

if (violations.length > 0) {
  console.error(violations.join('\n'))
  process.exitCode = 1
} else {
  console.log('Published types/exports targets exist.')
}

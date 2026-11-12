import { readdir, readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Run after `pnpm build`; Vite empties dist before writing the Vue bundle.

const repositoryRoot = new URL('..', import.meta.url)
const packagesRoot = new URL('packages/', repositoryRoot)
const packageDirectories = await readdir(packagesRoot, {
  withFileTypes: true,
})

const violations = []

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

  if (packageJson.name === '@ghostvue/vue') {
    try {
      const bundle = await readFile(
        resolve(packageDirectory, 'dist/ghostvue.js'),
        'utf8',
      )
      // Vite lib mode must leave this identifier so consumer bundlers can DCE
      // development-only warnings instead of baking true/false at publish time.
      if (!bundle.includes('process.env.NODE_ENV')) {
        violations.push(
          `${packageJson.name} bundle baked away process.env.NODE_ENV`,
        )
      }
    } catch {
      // Missing bundle is already reported as a published-file violation.
    }
  }
}

if (violations.length > 0) {
  console.error(violations.join('\n'))
  process.exitCode = 1
} else {
  console.log('Published types/exports targets exist.')
}

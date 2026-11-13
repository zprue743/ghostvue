import { readFile, readdir } from 'node:fs/promises'
import { extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { cruise } from 'dependency-cruiser'

import dependencyCruiserConfig from '../.dependency-cruiser.mjs'
import { workspacePackages } from './workspace-packages.mjs'

const repositoryRootUrl = new URL('..', import.meta.url)
// An optional workspace root lets integration fixtures exercise this CLI's
// collection, manifest validation, diagnostics, and exit status together.
const repositoryRootPath = resolve(
  process.argv[2] ?? fileURLToPath(repositoryRootUrl),
)
const packageDirectories = await readdir(join(repositoryRootPath, 'packages'), {
  withFileTypes: true,
})

const catalogByName = new Map(
  workspacePackages.map((workspacePackage) => [
    workspacePackage.name,
    workspacePackage,
  ]),
)

const violations = []
const seenPackageNames = new Set()

for (const directory of packageDirectories) {
  if (!directory.isDirectory()) continue

  const packageJsonPath = join(
    repositoryRootPath,
    'packages',
    directory.name,
    'package.json',
  )
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'))
  const catalogedPackage = catalogByName.get(packageJson.name)
  seenPackageNames.add(packageJson.name)

  if (!catalogedPackage) {
    violations.push(`Unregistered package boundary: ${packageJson.name}`)
    continue
  }

  // Package AGENTS.md paths and docs are derived from the catalog directory,
  // so a renamed folder with a stable package name would otherwise pass.
  if (catalogedPackage.directory !== directory.name) {
    violations.push(
      `${packageJson.name} must live in packages/${catalogedPackage.directory}, found packages/${directory.name}`,
    )
  }

  const allowedDependencies = new Set(catalogedPackage.allowedDependencies)
  const dependencyGroups = [
    packageJson.dependencies ?? {},
    packageJson.peerDependencies ?? {},
    packageJson.optionalDependencies ?? {},
  ]

  for (const dependencyName of dependencyGroups.flatMap(Object.keys)) {
    if (
      dependencyName.startsWith('@ghostvue/') &&
      !allowedDependencies.has(dependencyName)
    ) {
      violations.push(`${packageJson.name} may not depend on ${dependencyName}`)
    }
  }
}

for (const workspacePackage of workspacePackages) {
  if (!seenPackageNames.has(workspacePackage.name)) {
    violations.push(
      `Cataloged package missing from packages/: ${workspacePackage.name}`,
    )
  }
}

const EXCLUDED_DIRS = new Set([
  'node_modules',
  'dist',
  'generated',
  'fixtures',
  'coverage',
  'cache',
])

const SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.mjs',
  '.cjs',
  '.vue',
])

/**
 * Collects source files under the given roots while skipping build outputs,
 * generated files, and test fixtures so `dist` stays out of `from` entries
 * yet remains visible in `doNotFollow` for `no-dist-imports`.
 */
async function collectSourceFiles(roots) {
  const files = []

  async function walk(directoryPath) {
    const entries = await readdir(directoryPath, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRS.has(entry.name)) continue
        await walk(join(directoryPath, entry.name))
      } else if (entry.isFile() && SOURCE_EXTENSIONS.has(extname(entry.name))) {
        files.push(
          relative(
            repositoryRootPath,
            join(directoryPath, entry.name),
          ).replaceAll('\\', '/'),
        )
      }
    }
  }

  for (const root of roots) {
    await walk(join(repositoryRootPath, root))
  }
  return files
}

const sourceFiles = await collectSourceFiles([
  'packages',
  'apps',
  'examples',
  'tests',
  'scripts',
])

const cruiseResult = await cruise(sourceFiles, {
  ...dependencyCruiserConfig.options,
  baseDir: repositoryRootPath,
  tsConfig: { fileName: join(repositoryRootPath, 'tsconfig.json') },
  validate: true,
  ruleSet: {
    forbidden: dependencyCruiserConfig.forbidden,
  },
})

const cruiseOutput = cruiseResult.output
if (typeof cruiseOutput === 'string') {
  throw new TypeError('Expected structured JSON output from dependency-cruiser')
}

for (const violation of cruiseOutput.summary.violations) {
  const cycleInfo =
    violation.cycle && violation.cycle.length > 0
      ? ` (${violation.cycle.map((step) => step.name).join(' -> ')})`
      : ''
  violations.push(
    `[${violation.rule.name}] ${violation.from} -> ${violation.to}${cycleInfo}`,
  )
}

if (violations.length > 0) {
  console.error(violations.join('\n'))
  process.exitCode = 1
} else {
  console.log(
    `Package and source import boundaries are valid (${cruiseOutput.summary.totalCruised} modules, ${cruiseOutput.summary.totalDependenciesCruised} dependencies).`,
  )
}

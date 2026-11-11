import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { workspacePackages } from './workspace-packages.mjs'

const repositoryRoot = new URL('..', import.meta.url)
const packageDirectories = await readdir(new URL('packages/', repositoryRoot), {
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
    fileURLToPath(new URL('packages/', repositoryRoot)),
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
      dependencyName.startsWith('@slop-ui/') &&
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

if (violations.length > 0) {
  console.error(violations.join('\n'))
  process.exitCode = 1
} else {
  console.log('Package dependency boundaries are valid.')
}

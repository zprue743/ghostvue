/**
 * Keeps tool-specific agent adapters aligned with the canonical docs.
 *
 * CLAUDE.md, `.cursor/rules/*.mdc`, and each package `AGENTS.md` are generated
 * pointers, not competing rule sets. `--write` regenerates them from
 * `agent-adapter-catalog.mjs` and `workspace-packages.mjs`.
 */
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { toolAdapters } from './agent-adapter-catalog.mjs'
import { workspacePackages } from './workspace-packages.mjs'

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url))
const writeMode = process.argv.includes('--write')

function renderPackageAgentsMarkdown(workspacePackage) {
  const allowedDependencies =
    workspacePackage.allowedDependencies.length === 0
      ? 'none'
      : workspacePackage.allowedDependencies
          .map((dependencyName) => `\`${dependencyName}\``)
          .join(', ')

  return [
    `# ${workspacePackage.name}`,
    '',
    workspacePackage.responsibility,
    '',
    `Allowed workspace dependencies: ${allowedDependencies}.`,
    '',
    'See [package boundaries](../../docs/architecture/package-boundaries.md) for',
    'the allowed dependency graph and [AGENTS.md](../../AGENTS.md) for the',
    'repository agent entry.',
    '',
  ].join('\n')
}

function expectedAdapters() {
  const packageAdapters = workspacePackages.map((workspacePackage) => ({
    path: `packages/${workspacePackage.directory}/AGENTS.md`,
    canonicalTargets: ['docs/architecture/package-boundaries.md', 'AGENTS.md'],
    content: renderPackageAgentsMarkdown(workspacePackage),
  }))

  return [...toolAdapters, ...packageAdapters]
}

async function fileExists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

const adapters = expectedAdapters()
const violations = []

for (const adapter of adapters) {
  const absolutePath = join(repositoryRoot, adapter.path)

  for (const target of adapter.canonicalTargets) {
    if (!(await fileExists(join(repositoryRoot, target)))) {
      violations.push(
        `${adapter.path} points at missing canonical file: ${target}`,
      )
    }

    if (!adapter.content.includes(target)) {
      violations.push(
        `${adapter.path} does not mention canonical file ${target}`,
      )
    }
  }

  if (writeMode) {
    await mkdir(dirname(absolutePath), { recursive: true })
    await writeFile(absolutePath, adapter.content)
    continue
  }

  if (!(await fileExists(absolutePath))) {
    violations.push(`Missing adapter: ${adapter.path}`)
    continue
  }

  const actual = await readFile(absolutePath, 'utf8')
  if (actual !== adapter.content) {
    violations.push(`Adapter drifted from catalog: ${adapter.path}`)
  }
}

const expectedRulePaths = new Set(
  adapters
    .map((adapter) => adapter.path)
    .filter((path) => path.startsWith('.cursor/rules/')),
)
const ruleFiles = await readdir(join(repositoryRoot, '.cursor/rules'))

for (const fileName of ruleFiles) {
  if (!fileName.endsWith('.mdc')) continue

  const path = `.cursor/rules/${fileName}`
  if (!expectedRulePaths.has(path)) {
    violations.push(`Unregistered Cursor rule adapter: ${path}`)
  }
}

const boundariesDoc = await readFile(
  join(repositoryRoot, 'docs/architecture/package-boundaries.md'),
  'utf8',
)

for (const workspacePackage of workspacePackages) {
  if (!boundariesDoc.includes(workspacePackage.directory)) {
    violations.push(
      `docs/architecture/package-boundaries.md does not mention ${workspacePackage.directory}`,
    )
  }
}

const agentsDoc = await readFile(join(repositoryRoot, 'AGENTS.md'), 'utf8')
if (!agentsDoc.includes('docs/agents/AGENT_GUIDE.md')) {
  violations.push('AGENTS.md must link to docs/agents/AGENT_GUIDE.md')
}

if (writeMode) {
  if (violations.length > 0) {
    console.error(violations.join('\n'))
    process.exitCode = 1
  } else {
    console.log('Wrote agent adapters from the catalog.')
  }
} else if (violations.length > 0) {
  console.error(violations.join('\n'))
  console.error('\nRegenerate adapters with: pnpm adapters:write')
  console.error(
    'If the adapter change is intentional, update scripts/agent-adapter-catalog.mjs or scripts/workspace-packages.mjs first.',
  )
  process.exitCode = 1
} else {
  console.log('Agent adapters match the catalog.')
}

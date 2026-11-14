import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { pathToFileURL } from 'node:url'
import { promisify, stripVTControlCharacters } from 'node:util'

import { lineCoverageThreshold } from '../coverage-policy.mjs'
import {
  componentExamplePrefix,
  pascalToKebab,
  syncRepositoryManifests,
  validateExampleManifests,
  validateManifestSchemas,
} from './component-manifests.js'

const execFileAsync = promisify(execFile)
const checkNames = [
  'lint',
  'typecheck',
  'unit-coverage',
  'manifests',
  'boundaries',
  'e2e-axe',
]

/** Bounded diagnostics omit terminal control sequences and routine progress. */
export function firstErrorLines(output) {
  const lines = stripVTControlCharacters(String(output))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const index = lines.findIndex((line) =>
    /error|fail|violat|not found|cannot|missing|stale|no tests/i.test(line),
  )
  return lines
    .slice(Math.max(0, index - 1), Math.max(0, index - 1) + 12)
    .map((line) => line.slice(0, 500))
}

/** Run without a shell. Infrastructure errors and timeouts are failures too. */
export async function executeCommand(command, repositoryRoot) {
  try {
    const { stdout, stderr } = await execFileAsync(
      command[0],
      command.slice(1),
      {
        cwd: repositoryRoot,
        timeout: 180_000,
        maxBuffer: 4 * 1024 * 1024,
      },
    )
    return { ok: true, output: `${stdout}\n${stderr}` }
  } catch (error) {
    return {
      ok: false,
      output: `${error.stdout ?? ''}\n${error.stderr ?? ''}\n${error.message}`,
    }
  }
}

async function walk(directory, prefix = '') {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'generated', 'fixtures'].includes(entry.name))
      continue
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory())
      files.push(...(await walk(join(directory, entry.name), path)))
    else if (entry.isFile()) files.push(path)
  }
  return files.sort()
}

/** Select the component family, its contracts/composables, tests and examples. */
export async function discoverComponent(repositoryRoot, input) {
  const name = input.startsWith('Ghost') ? input : `Ghost${input}`
  if (!/^Ghost[A-Z][A-Za-z0-9]*$/.test(name))
    throw new Error('Use a PascalCase name such as Button or GhostButton.')
  const slug = componentExamplePrefix(name)
  const kebab = pascalToKebab(name)
  const family = new RegExp(`^${name}(?:[A-Z][A-Za-z0-9]*)?\\.vue$`)
  const files = []
  const names = new Set([name])
  for (const pkg of ['vue', 'themes']) {
    for (const file of await walk(
      join(repositoryRoot, 'packages', pkg, 'src'),
    )) {
      const leaf = basename(file)
      if (family.test(leaf)) names.add(leaf.slice(0, -4))
      if (
        family.test(leaf) ||
        leaf.startsWith(`${name}.`) ||
        leaf.startsWith(`${name}Exposed.`) ||
        leaf.startsWith(`${kebab}.`) ||
        leaf.startsWith(`${kebab}-`) ||
        leaf.startsWith(`use-${kebab}.`) ||
        leaf.startsWith(`use-${kebab}-`)
      )
        files.push(`packages/${pkg}/src/${file}`)
    }
  }
  // A miss must fail instead of turning an empty selection into a green report.
  if (!files.includes(`packages/vue/src/${name}.vue`))
    throw new Error(`Component ${name} not found in packages/vue/src.`)
  const manifests = []
  for (const pkg of ['vue', 'themes']) {
    for (const file of await readdir(
      join(repositoryRoot, 'packages', pkg, 'manifests'),
    )) {
      if (
        [...names].some(
          (member) => file === `${pascalToKebab(member)}.manifest.json`,
        )
      )
        manifests.push(`packages/${pkg}/manifests/${file}`)
    }
  }
  const examples = (await walk(join(repositoryRoot, 'examples')))
    .filter((file) => file.startsWith(`${slug}/`) && file.endsWith('.vue'))
    .map((file) => `examples/${file}`)
  const tests = [
    ...files.filter((file) => file.endsWith('.test.ts')),
    ...(await readdir(join(repositoryRoot, 'tests/integration')))
      .filter(
        (file) => file.startsWith(`${kebab}-`) && file.endsWith('.test.ts'),
      )
      .map((file) => `tests/integration/${file}`),
  ]
  const sources = files.filter(
    (file) =>
      /\.(ts|vue)$/.test(file) &&
      !file.endsWith('.test.ts') &&
      !file.endsWith('.d.ts'),
  )
  return {
    name,
    slug,
    names: [...names],
    files,
    sources,
    manifests,
    examples,
    tests,
  }
}

function command(...args) {
  return ['pnpm', ...args]
}

/** Execute every applicable check and always persist a report, including failures. */
export async function verifyComponent({
  repositoryRoot,
  name: input,
  reportPath,
  execute = executeCommand,
}) {
  const started = performance.now()
  const report = {
    schemaVersion: 1,
    component: input,
    status: 'fail',
    durationMs: 0,
    checks: [],
  }
  let temporary
  try {
    const component = await discoverComponent(repositoryRoot, input)
    report.component = component.name
    const reportsRoot = join(repositoryRoot, 'reports/verify-component')
    await mkdir(reportsRoot, { recursive: true })
    temporary = await mkdtemp(join(reportsRoot, '.run-'))
    const typesPath = join(temporary, 'tsconfig.json')
    const environmentPath = join(temporary, 'env.d.ts')
    // Mixed source/test entries run in Node. Preserve the library's explicit
    // NODE_ENV property while using Node's full process contract for tests.
    await writeFile(
      environmentPath,
      'declare namespace NodeJS { interface ProcessEnv { NODE_ENV?: string } }\n',
    )
    // Inherit the actual strict compiler settings; imported dependencies remain
    // in the type graph, while unrelated entry files are not checked.
    await writeFile(
      typesPath,
      JSON.stringify({
        extends: join(repositoryRoot, 'tsconfig.base.json'),
        compilerOptions: {
          noEmit: true,
          composite: false,
          jsx: 'preserve',
          types: ['vite/client', 'node'],
          paths: {
            '@ghostvue/vue': [
              join(repositoryRoot, 'packages/vue/src/index.ts'),
            ],
            '@ghostvue/themes': [
              join(repositoryRoot, 'packages/themes/src/index.ts'),
            ],
          },
        },
        files: [
          ...component.files.filter((file) => /\.(ts|vue)$/.test(file)),
          ...component.tests,
          ...component.examples,
        ]
          .map((file) => join(repositoryRoot, file))
          .concat(environmentPath),
      }),
    )
    const vitestPath = join(temporary, 'vitest.config.mjs')
    // Override entry/include arrays explicitly: merging them would accidentally
    // restore the full repository test suite. All other Vitest settings remain.
    await writeFile(
      vitestPath,
      `import base from ${JSON.stringify(pathToFileURL(join(repositoryRoot, 'vitest.config.ts')).href)}\nexport default { ...base, test: { ...base.test, include: ${JSON.stringify(component.tests)}, coverage: { ...base.test.coverage, include: ${JSON.stringify(component.sources)}, reportsDirectory: ${JSON.stringify(join(temporary, 'coverage'))}, reporter: ['json-summary'], thresholds: { ...base.test.coverage.thresholds, lines: ${lineCoverageThreshold} } } } }\n`,
    )
    const lintFiles = [
      ...component.files,
      ...component.examples,
      ...component.tests,
    ].filter((file) => /\.(ts|vue)$/.test(file))
    const escapedName = component.name // Name and slug contain only identifier characters/hyphens.
    const grep = `${escapedName}\\b|${component.slug}/|/components/${component.slug}\\b`
    const steps = {
      lint: [
        command('exec', 'eslint', ...lintFiles),
        command(
          'exec',
          'prettier',
          '--check',
          ...new Set([
            ...component.files,
            ...component.examples,
            ...component.tests,
          ]),
        ),
      ],
      typecheck: [command('exec', 'vue-tsc', '--noEmit', '-p', typesPath)],
      'unit-coverage': component.tests.length
        ? [
            command(
              'exec',
              'vitest',
              'run',
              '--config',
              vitestPath,
              '--coverage',
              '--reporter=dot',
            ),
          ]
        : [],
      manifests: async () => {
        const sync = await syncRepositoryManifests({ repositoryRoot })
        const violations = [
          ...sync.violations.filter((violation) =>
            component.manifests.some((manifestPath) =>
              violation.includes(manifestPath),
            ),
          ),
          ...(await validateExampleManifests(repositoryRoot, component.names)),
          ...(await validateManifestSchemas(
            repositoryRoot,
            component.manifests,
          )),
        ]
        return {
          ok: violations.length === 0 && component.manifests.length > 0,
          output:
            violations.join('\n') ||
            (component.manifests.length ? '' : 'Missing component manifests.'),
        }
      },
      boundaries: [
        command(
          'exec',
          'node',
          'scripts/check-package-boundaries.mjs',
          repositoryRoot,
          ...component.sources,
          ...component.examples,
        ),
      ],
      'e2e-axe': [
        command('--filter', '@ghostvue/playground', 'build'),
        command('--filter', '@ghostvue/docs', 'build'),
        command(
          'exec',
          'playwright',
          'test',
          '--project=chromium-e2e',
          '--grep',
          grep,
          '--reporter=line',
        ),
      ],
    }
    for (const check of checkNames) {
      const checkStart = performance.now()
      let result = { ok: true, output: '' }
      try {
        const step = steps[check]
        if (typeof step === 'function') result = await step()
        else if (step.length === 0)
          result = {
            ok: false,
            output: 'No unit tests found for this component.',
          }
        else {
          for (const args of step) {
            result = await execute(args, repositoryRoot)
            if (!result.ok) break
          }
        }
      } catch (error) {
        result = { ok: false, output: error.message }
      }
      report.checks.push({
        name: check,
        status: result.ok ? 'pass' : 'fail',
        durationMs: Math.round(performance.now() - checkStart),
        errors: result.ok ? [] : firstErrorLines(result.output),
      })
    }
  } catch (error) {
    report.checks.push({
      name: 'discovery',
      status: 'fail',
      durationMs: Math.round(performance.now() - started),
      errors: firstErrorLines(error.message),
    })
    for (const name of checkNames)
      report.checks.push({
        name,
        status: 'skip',
        durationMs: 0,
        errors: ['Component discovery did not complete.'],
      })
  } finally {
    if (temporary) await rm(temporary, { recursive: true, force: true })
  }
  report.status = report.checks.some((check) => check.status === 'fail')
    ? 'fail'
    : 'pass'
  report.durationMs = Math.round(performance.now() - started)
  // Invalid input must never be interpreted as a filesystem path.
  const safeName = /^Ghost[A-Z][A-Za-z0-9]*$/.test(report.component)
    ? report.component
    : 'InvalidComponent'
  const destination = reportPath
    ? resolve(repositoryRoot, reportPath)
    : join(repositoryRoot, 'reports/verify-component', `${safeName}.json`)
  await mkdir(resolve(destination, '..'), { recursive: true })
  await writeFile(destination, `${JSON.stringify(report, null, 2)}\n`)
  return { report, reportPath: destination }
}

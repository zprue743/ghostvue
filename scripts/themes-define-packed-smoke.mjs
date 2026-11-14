/**
 * Installs packed workspace tarballs into an isolated consumer and imports
 * `@ghostvue/themes/define`. No workspace aliases or devDependency fallbacks.
 */
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

const packOrder = ['shared', 'core', 'vue', 'themes']

/**
 * @param {{ ensureBuilt?: boolean }} [options] When true, runs `pnpm build` first (for Vitest before `verify`'s build step).
 * @returns {Promise<{ css: string, name: string }>}
 */
export async function runThemesDefinePackedSmoke(options = {}) {
  if (options.ensureBuilt) {
    execFileSync('pnpm', ['build'], {
      cwd: root,
      stdio: 'pipe',
      env: {
        ...process.env,
        COREPACK_HOME: process.env.COREPACK_HOME ?? '/tmp/corepack',
      },
    })
  }

  const packDir = await mkdtemp(join(tmpdir(), 'ghostvue-themes-pack-'))
  const consumerDir = await mkdtemp(join(tmpdir(), 'ghostvue-themes-consumer-'))

  try {
    const dependencies = {}

    for (const directory of packOrder) {
      const manifest = JSON.parse(
        await readFile(
          join(root, 'packages', directory, 'package.json'),
          'utf8',
        ),
      )
      const destination = join(packDir, directory)
      execFileSync('pnpm', ['pack', '--pack-destination', destination], {
        cwd: join(root, 'packages', directory),
        stdio: 'pipe',
      })
      const { readdir } = await import('node:fs/promises')
      const [archive] = (await readdir(destination)).filter((file) =>
        file.endsWith('.tgz'),
      )
      dependencies[manifest.name] = `file:${join(destination, archive)}`
    }

    await writeFile(
      join(consumerDir, 'package.json'),
      `${JSON.stringify(
        {
          name: 'ghostvue-packed-define-consumer',
          private: true,
          type: 'module',
          dependencies: {
            ...dependencies,
            vue: '3.5.41',
          },
        },
        null,
        2,
      )}\n`,
    )

    // npm resolves every @ghostvue package from the file: tarballs (packed manifests still say 0.0.0).
    execFileSync('npm', ['install', '--omit=dev'], {
      cwd: consumerDir,
      stdio: 'pipe',
    })

    const runner = join(consumerDir, 'run.mjs')
    await writeFile(
      runner,
      `import { defineTheme } from '@ghostvue/themes/define'
const theme = defineTheme({ name: 'acme', primary: '#0f766e' })
if (!theme.css.includes('[data-ghost-theme=\\'acme\\']')) {
  throw new Error('defineTheme output missing theme scope')
}
console.log(JSON.stringify({ name: theme.name, cssLength: theme.css.length }))
`,
    )

    const output = execFileSync('node', [runner], {
      cwd: consumerDir,
      encoding: 'utf8',
    })
    const parsed = JSON.parse(output.trim())
    if (parsed.name !== 'acme' || parsed.cssLength < 100) {
      throw new Error(`Unexpected defineTheme result: ${output}`)
    }
    return { name: parsed.name, css: `length=${parsed.cssLength}` }
  } finally {
    await rm(packDir, { recursive: true, force: true })
    await rm(consumerDir, { recursive: true, force: true })
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const ensureBuilt = process.argv.includes('--ensure-built')
    const result = await runThemesDefinePackedSmoke({ ensureBuilt })
    console.log(`@ghostvue/themes/define packed smoke passed (${result.name}).`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}

/** @vitest-environment node */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { build, loadConfigFromFile } from 'vite'
import { describe, expect, it } from 'vitest'

const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url))
const vuePackageDir = resolve(repositoryRoot, 'packages/vue')

describe('@ghostvue/vue external runtime dependencies', () => {
  it('externalizes @internationalized/date, preserves CalendarDate/parseDate identity, and tree-shakes unused calendar code', async () => {
    const loaded = await loadConfigFromFile(
      { command: 'build', mode: 'production' },
      resolve(vuePackageDir, 'vite.config.ts'),
      vuePackageDir,
    )
    expect(loaded).not.toBeNull()
    if (!loaded) {
      throw new Error('Expected packages/vue/vite.config.ts to load')
    }

    const outDir = await mkdtemp(join(vuePackageDir, '.cache-external-test-'))
    const consumerDir = await mkdtemp(join(tmpdir(), 'ghostvue-treeshake-'))

    try {
      await build({
        ...loaded.config,
        configFile: false,
        root: vuePackageDir,
        logLevel: 'silent',
        build: {
          ...loaded.config.build,
          outDir,
          emptyOutDir: true,
        },
      })

      const builtEntryPath = join(outDir, 'ghostvue.js')
      const builtSource = await readFile(builtEntryPath, 'utf8')

      expect(builtSource).toMatch(/from\s+["']vue["']/)
      expect(builtSource).toMatch(/from\s+["']@floating-ui\/dom["']/)
      expect(builtSource).toMatch(/from\s+["']@internationalized\/date["']/)
      expect(builtSource).not.toContain('GregorianCalendar')

      const datePkgDir = resolve(
        vuePackageDir,
        'node_modules/@internationalized/date',
      )
      const datePkg = JSON.parse(
        await readFile(resolve(datePkgDir, 'package.json'), 'utf8'),
      ) as {
        exports: { import: string }
      }
      const upstreamEsmPath = resolve(datePkgDir, datePkg.exports.import)
      const upstream = (await import(pathToFileURL(upstreamEsmPath).href)) as {
        CalendarDate: new (year: number, month: number, day: number) => object
        parseDate: (value: string) => object
      }

      const built = (await import(pathToFileURL(builtEntryPath).href)) as {
        CalendarDate: typeof upstream.CalendarDate
        parseDate: typeof upstream.parseDate
      }

      expect(built.CalendarDate).toBe(upstream.CalendarDate)
      expect(built.parseDate).toBe(upstream.parseDate)

      const upstreamDate = new upstream.CalendarDate(2026, 11, 17)
      expect(upstreamDate).toBeInstanceOf(built.CalendarDate)
      expect(built.parseDate('2026-11-17')).toBeInstanceOf(
        upstream.CalendarDate,
      )

      const consumerEntry = join(consumerDir, 'consumer.ts')
      await writeFile(
        consumerEntry,
        `import { GhostButton } from '${builtEntryPath.replaceAll('\\', '/')}'\nexport { GhostButton }\n`,
      )

      const consumerOutDir = join(consumerDir, 'dist')
      await build({
        configFile: false,
        root: consumerDir,
        logLevel: 'silent',
        plugins: [vue()],
        build: {
          outDir: consumerOutDir,
          emptyOutDir: true,
          minify: false,
          lib: {
            entry: consumerEntry,
            formats: ['es'],
            fileName: () => 'consumer.js',
          },
          rollupOptions: {
            external: ['vue', '@floating-ui/dom', '@internationalized/date'],
            treeshake: {
              moduleSideEffects: false,
            },
          },
        },
      })

      const consumerOutput = await readFile(
        join(consumerOutDir, 'consumer.js'),
        'utf8',
      )
      expect(consumerOutput).toContain('GhostButton')
      expect(consumerOutput).not.toContain('@internationalized/date')
      expect(consumerOutput).not.toContain('CalendarDate')

      const dateConsumerEntry = join(consumerDir, 'date-consumer.ts')
      await writeFile(
        dateConsumerEntry,
        `import { CalendarDate } from '${builtEntryPath.replaceAll('\\', '/')}'\nexport const createDate = () => new CalendarDate(2026, 11, 17)\n`,
      )

      const dateConsumerOutDir = join(consumerDir, 'date-dist')
      await build({
        configFile: false,
        root: consumerDir,
        logLevel: 'silent',
        plugins: [vue()],
        build: {
          outDir: dateConsumerOutDir,
          emptyOutDir: true,
          minify: false,
          lib: {
            entry: dateConsumerEntry,
            formats: ['es'],
            fileName: () => 'date-consumer.js',
          },
          rollupOptions: {
            external: ['vue', '@floating-ui/dom', '@internationalized/date'],
            treeshake: {
              moduleSideEffects: false,
            },
          },
        },
      })

      const dateConsumerOutput = await readFile(
        join(dateConsumerOutDir, 'date-consumer.js'),
        'utf8',
      )
      expect(dateConsumerOutput).toMatch(
        /import\s*\{\s*CalendarDate(?:\s+as\s+\w+)?\s*\}\s*from\s*["']@internationalized\/date["']/,
      )
      expect(dateConsumerOutput).not.toContain('startOfWeek')
      expect(dateConsumerOutput).not.toContain('endOfMonth')
      expect(dateConsumerOutput).not.toContain('parseDate')
    } finally {
      await rm(outDir, { recursive: true, force: true })
      await rm(consumerDir, { recursive: true, force: true })
    }
  }, 60_000)
})

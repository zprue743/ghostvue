/** @vitest-environment node */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { build } from 'vite'
import { describe, expect, it } from 'vitest'

const themesEntry = fileURLToPath(
  new URL('../../packages/themes/src/index.ts', import.meta.url),
)
const vueEntry = fileURLToPath(
  new URL('../../packages/vue/src/index.ts', import.meta.url),
)

describe('themes main-entry graph', () => {
  it('does not pull culori or defineTheme into a browser bundle', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'slop-themes-graph-'))
    const entry = join(dir, 'consumer.ts')
    await writeFile(
      entry,
      `import { flagshipThemes, startThemeTransition } from '@slop-ui/themes'

export const names = flagshipThemes
export const transition = startThemeTransition
`,
    )

    const outDir = join(dir, 'dist')
    await build({
      configFile: false,
      root: dir,
      logLevel: 'silent',
      plugins: [vue()],
      build: {
        outDir,
        emptyOutDir: true,
        minify: false,
        write: true,
        lib: {
          entry,
          formats: ['es'],
          fileName: () => 'consumer.js',
        },
        rollupOptions: {
          external: ['vue'],
        },
      },
      resolve: {
        alias: {
          '@slop-ui/themes/default.css': fileURLToPath(
            new URL('../../packages/themes/src/default.css', import.meta.url),
          ),
          '@slop-ui/themes': themesEntry,
          '@slop-ui/vue': vueEntry,
        },
      },
    })

    const output = await readFile(join(outDir, 'consumer.js'), 'utf8')
    await rm(dir, { recursive: true, force: true })

    expect(output).toContain('calm')
    expect(output).not.toMatch(/culori/)
    expect(output).not.toMatch(/defineTheme/)
    expect(output).not.toMatch(/clampChroma/)

    const packageJson = JSON.parse(
      await readFile(
        new URL('../../packages/themes/package.json', import.meta.url),
        'utf8',
      ),
    ) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    expect(packageJson.dependencies).not.toHaveProperty('culori')
    expect(packageJson.devDependencies).toHaveProperty('culori')
  }, 60_000)
})

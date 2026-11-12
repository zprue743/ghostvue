/** @vitest-environment node */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { build } from 'vite'
import { describe, expect, it } from 'vitest'

const vueEntry = fileURLToPath(
  new URL('../../packages/vue/src/index.ts', import.meta.url),
)

async function bundleConsumer(
  mode: 'development' | 'production',
): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'ghost-codes-'))
  const entry = join(dir, 'consumer.ts')
  await writeFile(
    entry,
    `import { useControllableState } from '@ghostvue/vue'

export function createState() {
  return useControllableState({
    prop: (): boolean | undefined => undefined,
    defaultValue: false,
  })
}
`,
  )

  const outDir = join(dir, 'dist')
  // Lib mode matches how apps consume `@ghostvue/vue`. `define` is what a
  // consumer application build does; the library itself leaves NODE_ENV intact.
  await build({
    configFile: false,
    root: dir,
    mode,
    logLevel: 'silent',
    // The package barrel re-exports SFCs such as GhostVisuallyHidden.
    plugins: [vue()],
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
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
        '@ghostvue/vue': vueEntry,
      },
    },
  })

  const output = await readFile(join(outDir, 'consumer.js'), 'utf8')
  await rm(dir, { recursive: true, force: true })
  return output
}

describe('GHOST0 production DCE', () => {
  it('keeps GHOST0 strings in development and strips them in production', async () => {
    const development = await bundleConsumer('development')
    expect(development).toMatch(/GHOST0/)
    expect(development).toContain('useControllableState')

    const production = await bundleConsumer('production')
    expect(production).not.toMatch(/GHOST0/)
    expect(production).toContain('useControllableState')
  }, 60_000)
})

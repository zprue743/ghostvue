/** @vitest-environment node */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { build } from 'vite'
import { describe, expect, it } from 'vitest'

import { bundleFixture } from '../../scripts/lib/bundle-size.js'

const themesEntry = fileURLToPath(
  new URL('../../packages/themes/src/index.ts', import.meta.url),
)
const vueEntry = fileURLToPath(
  new URL('../../packages/vue/src/index.ts', import.meta.url),
)

describe('themes main-entry graph', () => {
  it('does not pull culori or defineTheme into a browser bundle', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ghost-themes-graph-'))
    let output: string
    try {
      const entry = join(dir, 'consumer.ts')
      await writeFile(
        entry,
        `import { flagshipThemes, startThemeTransition } from '@ghostvue/themes'

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
            '@ghostvue/themes/default.css': fileURLToPath(
              new URL('../../packages/themes/src/default.css', import.meta.url),
            ),
            '@ghostvue/themes': themesEntry,
            '@ghostvue/vue': vueEntry,
          },
        },
      })

      output = await readFile(join(outDir, 'consumer.js'), 'utf8')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }

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
    // Themes has no runtime dependencies at all; @ghostvue/vue is a peer (#345).
    expect(packageJson.dependencies ?? {}).not.toHaveProperty('culori')
    expect(packageJson.devDependencies).toHaveProperty('culori')
  }, 60_000)

  it('keeps the published main entry side-effectful so its base CSS import survives', async () => {
    // #346: with only CSS listed in `sideEffects`, Vite production builds
    // treat `dist/index.js` as side-effect free, keep the re-exported
    // components, and drop its `import './default.css'`, so documented
    // consumers shipped unstyled themed components. `pnpm consumer:packed`
    // proves the fix end to end; this catches a regression without a build.
    const packageJson = JSON.parse(
      await readFile(
        new URL('../../packages/themes/package.json', import.meta.url),
        'utf8',
      ),
    ) as {
      sideEffects?: string[] | boolean
      exports: Record<string, string | Record<string, string>>
    }
    const mainEntry = packageJson.exports['.']
    const mainImport =
      typeof mainEntry === 'string' ? mainEntry : mainEntry?.import
    expect(mainImport).toBe('./dist/index.js')
    expect(packageJson.sideEffects).toEqual(
      expect.arrayContaining(['**/*.css', mainImport]),
    )

    const source = await readFile(themesEntry, 'utf8')
    expect(source).toMatch(/^import '\.\/default\.css'$/m)
  })
})

describe('opt-in theme CSS (#386)', () => {
  const themesSrc = fileURLToPath(
    new URL('../../packages/themes/src/', import.meta.url),
  )

  /**
   * Bundle a consumer against package sources the way an application
   * production build would, mapping each public specifier the fixtures use
   * to the source file its published counterpart is built from.
   */
  async function buildConsumerCss(source: string): Promise<string> {
    const { css } = await bundleFixture({
      source,
      aliases: {
        '@ghostvue/themes/components': `${themesSrc}components.ts`,
        '@ghostvue/themes/default.css': `${themesSrc}default.css`,
        '@ghostvue/themes/base.css': `${themesSrc}base.css`,
        '@ghostvue/themes/calm.css': `${themesSrc}generated/calm.css`,
        '@ghostvue/themes/recipes/button.css': `${themesSrc}ghost-button.css`,
      },
      // The headless package ships no CSS, so it can stay external here.
      external: ['vue', '@ghostvue/vue'],
    })
    return css
  }

  it('ships only the selected recipes, the shared base, and one palette', async () => {
    const css = await buildConsumerCss(
      `import '@ghostvue/themes/calm.css'
import '@ghostvue/themes/base.css'
import '@ghostvue/themes/recipes/button.css'
export { GhostButton, GhostDialog } from '@ghostvue/themes/components'
`,
    )

    expect(css).toMatch(/\.ghost-button\b/)
    expect(css).toMatch(/\[data-ghost-theme=['"]?calm['"]?\]/)
    // Shared base: wrapper scope and semantic elevation recipes.
    expect(css).toMatch(/\.ghost-themed-scope\)\s*\{\s*display:\s*contents/)
    expect(css).toMatch(/\[data-elevation=['"]?1['"]?\]/)
    // Importing GhostDialog from the components entry must not pull in its
    // recipe or the all-in default palette.
    expect(css).not.toMatch(/\.ghost-dialog\b/)
    expect(css).not.toMatch(/\[data-ghost-theme=['"]?default['"]?\]/)
  }, 60_000)

  it('the components entry alone emits no CSS, while default.css keeps every recipe', async () => {
    expect(
      await buildConsumerCss(
        `export { GhostButton } from '@ghostvue/themes/components'\n`,
      ),
    ).toBe('')

    // The main entry's own `import './default.css'` surviving a production
    // build is covered by `pnpm consumer:packed` against the packed tarball.
    const allIn = await buildConsumerCss(
      `import '@ghostvue/themes/default.css'\n`,
    )
    for (const recipe of ['ghost-button', 'ghost-dialog', 'ghost-toast']) {
      expect(allIn, recipe).toMatch(new RegExp(`\\.${recipe}\\b`))
    }
    expect(allIn).toMatch(/\[data-ghost-theme=['"]?default['"]?\]/)
    expect(allIn).toMatch(/\.ghost-themed-scope\)\s*\{\s*display:\s*contents/)
  }, 60_000)
})

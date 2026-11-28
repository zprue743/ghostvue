/** @vitest-environment node */

import { describe, expect, it } from 'vitest'

import {
  consumerDependencyPins,
  cssTransferSize,
  declaresThemeLayer,
  eslintConsumerProblems,
  nuxtAutoImportProblems,
  nuxtComponentSources,
  nuxtImportSources,
  nuxtPageProblems,
  optInBuildCssProblems,
  themedBuildCssProblems,
  viteAppMountProblems,
  viteOptInMountProblems,
  type MountObservation,
} from '../../scripts/lib/consumer-packed.js'

// Judgement rules for `pnpm consumer:packed` (GHO-217). The script itself
// packs and installs real tarballs; it runs in `verify:build` and in
// consumer-packed-smoke.test.ts.

const passingMount: MountObservation = {
  mounted: true,
  input: { tag: 'INPUT', value: 'Ada', label: 'Workspace name' },
  select: {
    role: 'combobox',
    value: 'Europe',
    options: ['Europe', 'United States'],
  },
  dialog: {
    open: ['Smoke dialog Mounted from packed tarballs. Close'],
    afterClose: [],
    portals: {
      content: { teleported: true, theme: 'calm', themed: true },
      overlay: { teleported: true, theme: 'calm', themed: true },
    },
  },
  drawer: { open: ['Smoke drawer Also mounted from packed tarballs.'] },
  toast: { shown: true },
  errors: [],
}

describe('consumerDependencyPins', () => {
  it('reads exact third-party versions from the workspace manifests', async () => {
    const pins = await consumerDependencyPins(process.cwd())
    expect(Object.keys(pins).sort()).toEqual([
      '@vitejs/plugin-vue',
      'eslint',
      'jsdom',
      'nuxt',
      'vite',
      'vue',
      'vue-eslint-parser',
    ])
    for (const version of Object.values(pins)) {
      expect(version).toMatch(/^\d+\.\d+\.\d+$/)
    }
  })
})

describe('declaresThemeLayer', () => {
  it('finds a ghostvue-theme layer block in minified or formatted CSS', () => {
    expect(declaresThemeLayer('@layer ghostvue-theme{.ghost-button{}}')).toBe(
      true,
    )
    expect(declaresThemeLayer('@layer ghostvue-theme {\n  .x {}\n}')).toBe(true)
    // An order statement names the layer but carries no styles.
    expect(declaresThemeLayer('@layer reset, ghostvue-theme;')).toBe(false)
    expect(declaresThemeLayer('@layer ghostvue-themes{}')).toBe(false)
    expect(declaresThemeLayer('.ghost-button{color:red}')).toBe(false)
  })
})

describe('themedBuildCssProblems', () => {
  // Minified the way Vite emits it: quotes dropped from attribute values.
  const base =
    '@layer ghostvue-theme{:where(.ghost-theme .ghost-button){}.ghost-field{}:where(.ghost-theme .ghost-input){}.ghost-toast{}}'
  const calmHost = '@layer ghostvue-theme{[data-ghost-theme=calm]{--x:1}}'

  it('accepts base recipes plus the flagship token host', () => {
    expect(
      themedBuildCssProblems(base + calmHost, { flagship: 'calm' }),
    ).toEqual([])
    expect(
      themedBuildCssProblems(base + "[data-ghost-theme='calm']{}", {
        flagship: 'calm',
      }),
    ).toEqual([])
  })

  it('reports a dropped base stylesheet even when the flagship opens the layer', () => {
    // Regression for #346: Vite tree-shook the `@ghostvue/themes` entry's
    // `import './default.css'`, leaving only the explicitly imported flagship.
    const problems = themedBuildCssProblems(calmHost, { flagship: 'calm' })
    expect(problems).toHaveLength(4)
    expect(problems.join('\n')).toContain('`.ghost-button` recipe')
  })

  it('does not count prefixed class names or a missing flagship', () => {
    expect(
      themedBuildCssProblems(
        '@layer ghostvue-theme{.ghost-button-group{}.ghost-field{}.ghost-input{}.ghost-toast{}}',
        { flagship: 'calm' },
      ),
    ).toEqual([
      'no `.ghost-button` recipe; the base stylesheet imported by `@ghostvue/themes` was dropped',
      'no `[data-ghost-theme=calm]` token host',
    ])
    expect(
      themedBuildCssProblems(
        '.ghost-button{}.ghost-field{}.ghost-input{}.ghost-toast{}[data-ghost-theme=calm]{}',
        {
          flagship: 'calm',
        },
      ),
    ).toEqual(['no `@layer ghostvue-theme` block'])
  })
})

describe('viteAppMountProblems', () => {
  it('accepts a fully working mount', () => {
    expect(viteAppMountProblems(passingMount)).toEqual([])
  })

  it('reports each component that did not behave', () => {
    const problems = viteAppMountProblems({
      ...passingMount,
      input: { tag: 'INPUT', value: '', label: null },
      select: { role: 'button', value: 'Europe', options: [] },
      dialog: { open: [], afterClose: [] },
      drawer: { open: [] },
      toast: { shown: false },
      errors: ['TypeError: boom'],
    })
    expect(problems).toEqual([
      'GhostInput v-model rendered "", expected "Ada"',
      'GhostFieldLabel is not associated with the GhostInput control',
      'GhostSelectTrigger role is "button", expected "combobox"',
      'opening GhostSelect did not list both options',
      'GhostDialogTrigger did not open a role="dialog" with its title',
      'GhostDrawerTrigger did not open a role="dialog" with its title',
      'useGhostToast().toast() showed nothing',
      'runtime errors: TypeError: boom',
    ])
  })

  it('reports a dialog that stays open and an app that never mounted', () => {
    expect(
      viteAppMountProblems({
        ...passingMount,
        mounted: false,
        dialog: {
          ...passingMount.dialog,
          open: ['Smoke dialog'],
          afterClose: ['Smoke dialog'],
        },
      }),
    ).toEqual([
      'the app did not mount into #app',
      'GhostDialogClose did not close the dialog',
    ])
  })
})

describe('optInBuildCssProblems', () => {
  // Minified the way Vite emits calm.css + base.css + selected recipes.
  const optInCss =
    '@layer ghostvue-theme{:where([data-ghost-theme=calm]){--x:1}}' +
    '@layer ghostvue-theme{:where(.ghost-themed-scope){display:contents}}' +
    '@layer ghostvue-theme{:where(.ghost-theme .ghost-button){}:where(.ghost-themed-scope .ghost-input){}}'
  const options = {
    flagship: 'calm',
    recipes: ['ghost-button', 'ghost-input'],
    absentRecipes: ['ghost-dialog', 'ghost-toast'],
  }

  it('accepts the palette, the shared base, and only the selected recipes', () => {
    expect(optInBuildCssProblems(optInCss, options)).toEqual([])
    // Formatted (unminified) output passes too.
    expect(
      optInBuildCssProblems(
        `${optInCss}\n:where(.ghost-themed-scope) {\n  display: contents;\n}`,
        options,
      ),
    ).toEqual([])
  })

  it('reports leaked all-in CSS: unrelated recipes and the default palette', () => {
    expect(
      optInBuildCssProblems(
        `${optInCss}.ghost-dialog{}[data-ghost-theme='default']{--x:2}`,
        options,
      ),
    ).toEqual([
      'unrelated `.ghost-dialog` recipe shipped; the all-in stylesheet leaked into the opt-in build',
      'default palette tokens shipped; the opt-in build should carry only the chosen flagship',
    ])
  })

  it('reports a missing base, selected recipe, or palette', () => {
    expect(
      optInBuildCssProblems(
        '@layer ghostvue-theme{.ghost-button-group{}.ghost-input{}}',
        options,
      ),
    ).toEqual([
      'no `.ghost-themed-scope { display: contents }` rule; `@ghostvue/themes/base.css` was dropped',
      'no `.ghost-button` recipe that the app imported',
      'no `[data-ghost-theme=calm]` token host',
    ])
  })
})

describe('cssTransferSize', () => {
  it('sums minified bytes and per-file gzip bytes', () => {
    const sheets = ['.a{color:red}', '.b{color:blue}'.repeat(50)]
    const size = cssTransferSize(sheets)
    expect(size.files).toBe(2)
    expect(size.minifiedBytes).toBe(sheets.join('').length)
    // Repetitive CSS compresses below its minified size.
    expect(size.gzipBytes).toBeGreaterThan(0)
    expect(size.gzipBytes).toBeLessThan(size.minifiedBytes)
    expect(cssTransferSize([])).toEqual({
      files: 0,
      minifiedBytes: 0,
      gzipBytes: 0,
    })
  })
})

describe('viteOptInMountProblems', () => {
  const optInMount: MountObservation = {
    mounted: true,
    input: { tag: 'INPUT', value: 'Ada', label: 'Workspace name' },
    button: { tag: 'BUTTON', text: 'Save' },
    dialog: passingMount.dialog,
    errors: [],
  }

  it('accepts Field, Input, Button, and a portaled Dialog without the all-in components', () => {
    expect(viteOptInMountProblems(optInMount)).toEqual([])
  })

  it('reports portaled dialog parts that left the palette host', () => {
    // #386 review: with the palette on an app wrapper, the overlay and content
    // teleport to <body> outside it and their recipe reads unset tokens.
    expect(
      viteOptInMountProblems({
        ...optInMount,
        dialog: {
          ...optInMount.dialog,
          portals: {
            content: { teleported: true, theme: null, themed: true },
            overlay: { teleported: false, theme: 'calm', themed: true },
          },
        },
      }),
    ).toEqual([
      'teleported GhostDialog content sits under null instead of the calm palette host, so its recipe has no tokens',
      'GhostDialog overlay was not a themed part teleported out of #app',
    ])
    expect(
      viteAppMountProblems({
        ...passingMount,
        dialog: {
          ...passingMount.dialog,
          portals: { content: null, overlay: null },
        },
      }),
    ).toEqual([
      'GhostDialog content did not render',
      'GhostDialog overlay did not render',
    ])
  })

  it('reports a missing button and runtime errors', () => {
    expect(
      viteOptInMountProblems({
        ...optInMount,
        button: null,
        errors: ['TypeError: boom'],
      }),
    ).toEqual([
      'GhostButton from @ghostvue/themes/components did not render',
      'runtime errors: TypeError: boom',
    ])
  })
})

describe('Nuxt auto-import declarations', () => {
  const components = [
    `export const GhostButton: typeof import("@ghostvue/vue")['GhostButton']`,
    `export const GhostDialog: typeof import("@ghostvue/vue")['GhostDialog']`,
    `export const GhostSelect: typeof import("@ghostvue/vue")['GhostSelect']`,
    `export const LazyGhostButton: LazyComponent<typeof import("@ghostvue/vue")['GhostButton']>`,
  ].join('\n')
  const imports = [
    `export { useHead } from '#app/composables/head';`,
    `export { useGhostId, useGhostToast as useGhostToast } from '@ghostvue/vue';`,
  ].join('\n')

  it('parses components.d.ts and imports.d.ts', () => {
    expect([...nuxtComponentSources(components)]).toEqual([
      ['GhostButton', '@ghostvue/vue'],
      ['GhostDialog', '@ghostvue/vue'],
      ['GhostSelect', '@ghostvue/vue'],
    ])
    expect(nuxtImportSources(imports).get('useGhostToast')).toBe(
      '@ghostvue/vue',
    )
    expect(nuxtImportSources(imports).get('useHead')).toBe(
      '#app/composables/head',
    )
  })

  it('requires components from the configured package and composables from @ghostvue/vue', () => {
    const generated = {
      components: nuxtComponentSources(components),
      imports: nuxtImportSources(imports),
    }
    expect(
      nuxtAutoImportProblems({
        ...generated,
        componentPackage: '@ghostvue/vue',
      }),
    ).toEqual([])
    expect(
      nuxtAutoImportProblems({
        ...generated,
        componentPackage: '@ghostvue/themes',
      }),
    ).toHaveLength(3)
    expect(
      nuxtAutoImportProblems({
        components: generated.components,
        imports: new Map(),
        componentPackage: '@ghostvue/vue',
      }),
    ).toEqual([
      'useGhostId() auto-imports from undefined, expected @ghostvue/vue',
      'useGhostToast() auto-imports from undefined, expected @ghostvue/vue',
    ])
  })
})

describe('nuxtPageProblems', () => {
  it('requires the server-rendered button with an SSR id', () => {
    expect(
      nuxtPageProblems(
        '<main><button class="ghost-button" data-smoke-id="smoke-v-0" type="button"><!--[-->Auto-imported<!--]--></button></main>',
      ),
    ).toEqual([])
    expect(
      nuxtPageProblems(
        '<button class="ghost-button" type="button">Auto-imported</button>',
      ),
    ).toEqual(['the auto-imported useGhostId() did not run during SSR'])
    expect(
      nuxtPageProblems('<ghostbutton>Auto-imported</ghostbutton>'),
    ).toEqual(['the auto-imported <GhostButton> did not server-render'])
  })
})

describe('eslintConsumerProblems', () => {
  const flagged = (ruleIds: string[]) =>
    ruleIds.map((ruleId) => ({ ruleId, message: `${ruleId} failed` }))

  it('requires a clean valid file and every rule on the invalid file', () => {
    expect(
      eslintConsumerProblems([
        { filePath: '/c/src/Valid.vue', messages: [] },
        {
          filePath: '/c/src/Invalid.vue',
          messages: flagged([
            'ghostvue/no-unknown-props',
            'ghostvue/no-unknown-slots',
            'ghostvue/no-undeclared-v-model',
          ]),
        },
      ]),
    ).toEqual([])
  })

  it('reports false positives, missed rules, and unrelated errors', () => {
    expect(
      eslintConsumerProblems([
        {
          filePath: 'C:\\c\\src\\Valid.vue',
          messages: flagged(['ghostvue/no-unknown-props']),
        },
        {
          filePath: 'C:\\c\\src\\Invalid.vue',
          messages: [
            ...flagged(['ghostvue/no-unknown-props']),
            { ruleId: null, message: 'Parsing error' },
          ],
        },
      ]),
    ).toEqual([
      'Valid.vue should pass, got: ghostvue/no-unknown-props: ghostvue/no-unknown-props failed',
      'Invalid.vue was not flagged by ghostvue/no-unknown-slots',
      'Invalid.vue was not flagged by ghostvue/no-undeclared-v-model',
      'Invalid.vue has non-GhostVue problems: Parsing error',
    ])
    expect(eslintConsumerProblems([])).toEqual([
      'ESLint did not lint Valid.vue',
      'ESLint did not lint Invalid.vue',
    ])
  })
})

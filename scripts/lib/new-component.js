import { existsSync } from 'node:fs'
import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { format, resolveConfig } from 'prettier'

import { pascalToKebab, serializeManifest } from './component-manifests.js'
import { beginMarker, endMarker, renderComponentApi } from './docs-api.js'
import { execPackageManagerSync } from './package-manager.js'

const BUNDLE_SIZE_BUDGETS_PATH = 'scripts/bundle-size-budgets.json'
/**
 * Provisional gzip budget for a scaffolded component import. The neutral
 * scaffold measures well under 1 kB in either package; 2 kB leaves room for
 * early implementation without hiding a real regression for long.
 */
const SCAFFOLD_BUNDLE_BUDGET_BYTES = 2000

function stableStringify(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

/** Normalize the optional Ghost prefix, rejecting paths and invalid identifiers. */
export function componentIdentity(input) {
  if (typeof input !== 'string' || !/^[A-Z][A-Za-z0-9]*$/.test(input)) {
    throw new Error(
      'Use a PascalCase component name, for example Switch or GhostSwitch.',
    )
  }
  const suffix = input.startsWith('Ghost') ? input.slice(5) : input
  if (!/^[A-Z][A-Za-z0-9]*$/.test(suffix)) {
    throw new Error('The Ghost prefix must be followed by a PascalCase name.')
  }
  const name = `Ghost${suffix}`
  const slug = pascalToKebab(name).slice(6)
  if (slug.length < 2)
    throw new Error(
      'Component names need at least two characters for manifest example ids.',
    )
  return { name, suffix, slug }
}

function manifest(name, packageName, slug) {
  return {
    schemaVersion: '1.0.0',
    source: packageName === '@ghostvue/vue' ? 'generated' : 'handwritten',
    name,
    package: packageName,
    status: 'experimental',
    description:
      'Scaffold only: neutral content container. Approve the component specification before implementing widget behavior.',
    props: [],
    models: [],
    events: [],
    slots: [{ name: 'default', props: [], description: 'Container content.' }],
    exposed: [
      {
        name: 'element',
        kind: 'property',
        type: 'HTMLElement | null',
        description: 'Root element after mount; null before mount.',
      },
    ],
    styling: {
      parts: [{ name: 'root', description: 'Neutral content container.' }],
      states: [],
      cssProperties:
        packageName === '@ghostvue/themes'
          ? [
              {
                name: '--ghost-surface-fg',
                description: 'Inherited text color.',
              },
            ]
          : [],
    },
    accessibility: {
      role: 'generic',
      apgPattern: 'https://www.w3.org/WAI/ARIA/apg/',
      keyboard: {},
      requiredAriaAttributes: [],
    },
    examples: [`${slug}/basic`],
  }
}

/** Plan all additions and wiring first; dry-run uses the identical validation. */
export async function scaffoldComponent(
  repositoryRoot,
  input,
  { dryRun = false } = {},
) {
  const { name, suffix, slug } = componentIdentity(input)
  const base = `ghost-${slug}`
  const vueManifest = manifest(name, '@ghostvue/vue', slug)
  const themesManifest = manifest(name, '@ghostvue/themes', slug)
  // Pre-render the docs-api blocks so the new page already passes
  // `pnpm docs:api`, which requires both blocks on every component page.
  const docsApiBlock = (block, entry, headless) =>
    [
      beginMarker(block),
      '',
      renderComponentApi(entry, {
        sourcePath: `packages/${block.split('/')[0]}/manifests/${base}.manifest.json`,
        headless,
      }),
      '',
      endMarker(block),
    ].join('\n')
  const files = new Map([
    [
      `packages/vue/src/${base}.ts`,
      `/** Template ref contract for the ${name} scaffold. */
export interface ${name}Exposed {
  /** Root element after mount; null before mount. */
  readonly element: HTMLElement | null
}
`,
    ],
    [
      `packages/vue/src/use-${base}.ts`,
      `import { shallowRef } from 'vue'

export interface ${name}RootProps {
  class: '${base}'
  'data-part': 'root'
  'data-${base}': ''
}

/** Scaffold root hooks and ref. Replace with the approved behavior contract. */
export function use${name}() {
  const element = shallowRef<HTMLElement | null>(null)
  const rootProps: ${name}RootProps = {
    class: '${base}',
    'data-part': 'root',
    'data-${base}': '',
  }
  return { element, rootProps }
}
`,
    ],
    [
      `packages/vue/src/${name}.vue`,
      `<script setup lang="ts">
import type { ${name}Exposed } from './${base}'
import { use${name} } from './use-${base}'

// Neutral scaffold only. Approve semantics before introducing widget behavior.
const { element, rootProps } = use${name}()
defineSlots<{ default(): unknown }>()
defineExpose<${name}Exposed>({
  get element() { return element.value },
})
</script>

<template>
  <div ref="element" v-bind="rootProps"><slot /></div>
</template>
`,
    ],
    [
      `packages/themes/src/${base}.ts`,
      `import { defineComponent, h, ref } from 'vue'

import { ${name} as GhostUnstyled${suffix}, type ${name}Exposed } from '@ghostvue/vue'

/** Themed scaffold; behavior remains in @ghostvue/vue. */
export const ${name} = defineComponent({
  name: '${name}',
  inheritAttrs: false,
  setup(_props, { attrs, slots, expose }) {
    const inner = ref<${name}Exposed | null>(null)

    expose({
      get element() {
        return inner.value?.element ?? null
      },
    } satisfies ${name}Exposed)

    return () => h('span', { class: 'ghost-themed-scope' }, [
      h(GhostUnstyled${suffix}, { ...attrs, ref: inner }, slots),
    ])
  },
})

export type { ${name}Exposed }
`,
    ],
    [
      `packages/themes/src/${base}.css`,
      `/* Scaffold recipe: replace after the component specification is approved. */
@layer ghostvue-theme {
  :where(.ghost-theme, .ghost-themed-scope) .${base}[data-${base}] {
    color: var(--ghost-surface-fg);
  }
}
`,
    ],
    [
      `packages/vue/manifests/${base}.manifest.json`,
      serializeManifest(vueManifest),
    ],
    [
      `packages/themes/manifests/${base}.manifest.json`,
      serializeManifest(themesManifest),
    ],
    [
      `docs/components/${slug}.md`,
      `# ${name}

Scaffold only: a neutral content container with a default slot, native attribute
fallthrough, and headless/themed \`element\` refs. It does not implement ${suffix} widget
semantics. Complete and approve the [specification](/specs/${slug}) before
using it in production.

## Example

<GhostExample id="${slug}/basic" />

## API

${docsApiBlock(`vue/${base}`, vueManifest)}

${docsApiBlock(`themes/${base}`, themesManifest, vueManifest)}

The root has \`data-part="root"\`, \`data-${base}\`, and class \`${base}\`.
The themed wrapper uses \`--ghost-surface-fg\`.

## Accessibility and follow-ups

The scaffold is a non-interactive div. Define keyboard behavior, roles, focus,
state, SSR requirements, and meaningful behavior tests in the specification.
`,
    ],
    [
      `docs/components/${slug}-spec.md`,
      `---
schemaVersion: 1.0.0
component: ${name}
components:
  - ${name}
packages:
  - '@ghostvue/vue'
  - '@ghostvue/themes'
specStatus: draft
manifests:
  - packages/vue/manifests/${base}.manifest.json
  - packages/themes/manifests/${base}.manifest.json
sections:
  purpose:
    applicable: true
  nonGoals:
    applicable: true
  publicApi:
    applicable: true
  stateModel:
    applicable: true
  consumerData:
    applicable: true
  accessibility:
    applicable: true
  rendering:
    applicable: true
  environment:
    applicable: true
  performance:
    applicable: true
  composition:
    applicable: true
  testPlan:
    applicable: true
  documentationPlan:
    applicable: true
  compatibility:
    applicable: true
unresolvedQuestions: []
---

# ${name} specification

Status: draft; approval required before implementing production behavior.

Use the [component specification template](/components/spec-template) to replace
these draft scaffold notes before requesting design approval.

## Purpose and user problems

Neutral generated scaffold for \`${name}\`; replace with the user problem and
intended use cases before production implementation.

## Non-goals

Production widget behavior is outside this generated neutral container scaffold.

## Public API

Exposes the default slot, native attribute fallthrough, and \`element\` ref on
the root container until the approved API is specified.

## State model

Stateless neutral container scaffold; define controlled and uncontrolled state
transitions before implementation.

## Consumer data

The generated neutral scaffold does not accept consumer data collections.

## Accessibility contract

Renders a non-interactive container element; define roles, keyboard interaction,
and focus management before implementation.

## Rendering and customization

Exposes \`data-part="root"\` and \`data-${base}\` styling hooks plus default slot
composition.

## Environment behavior

Deterministic SSR markup with no browser-only side effects in the scaffold.

## Performance

Constant-time single-element render for the neutral scaffold container.

## Composition

Standalone neutral container scaffold until composition with existing primitives
is specified.

## Test plan

Includes scaffold unit, themed wrapper ref, and Playwright/Axe smoke tests;
expand for full behavior coverage upon approval.

## Documentation plan

Includes \`docs/components/${slug}.md\` and \`examples/${slug}/basic.vue\`;
expand with API reference and edge-case guides upon approval.

## Compatibility and release impact

Unpublished draft scaffold; add a Changeset before shipping consumer-visible
behavior.

## Open architectural questions

Approve the \`${name}\` specification before implementing production behavior.
`,
    ],
    [
      `examples/${slug}/basic.vue`,
      `<script setup lang="ts">
import { ${name} } from '@ghostvue/vue'
</script>

<template><${name}>${suffix} scaffold content</${name}></template>
`,
    ],
    [
      `packages/vue/src/${name}.test.ts`,
      `import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'

import type { ${name}Exposed } from './${base}'
import ${name} from './${name}.vue'

describe('${name} scaffold', () => {
  it('renders slot content, forwards native attrs, and exposes the mounted root', () => {
    const component = ref<${name}Exposed | null>(null)
    const host = defineComponent({ setup: () => () => h(${name}, { ref: component, id: 'scaffold' }, () => 'Content') })
    const wrapper = mount(host)
    expect(wrapper.text()).toBe('Content')
    expect(wrapper.attributes('id')).toBe('scaffold')
    expect(wrapper.attributes('data-part')).toBe('root')
    expect(wrapper.attributes('data-${base}')).toBe('')
    expect(component.value?.element).toBe(wrapper.element)
    wrapper.unmount()
  })
})
`,
    ],
    [
      `tests/integration/${base}-themed.test.ts`,
      `import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'

import { ${name}, type ${name}Exposed } from '../../packages/themes/src/index'

describe('themed ${name} scaffold', () => {
  it('exposes the mounted content root through the public themed export', () => {
    const component = ref<${name}Exposed | null>(null)
    const host = defineComponent({ setup: () => () => h(${name}, { ref: component }, () => 'Content') })
    const wrapper = mount(host)
    const exposed = component.value
    expect(exposed?.element).toBe(wrapper.get('[data-${base}]').element)
    expect(exposed?.element).not.toBe(wrapper.element)
    wrapper.unmount()
    expect(exposed?.element).toBeNull()
  })
})
`,
    ],
    [
      `tests/e2e/${base}.spec.ts`,
      `import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

// Extend with keyboard, focus and state assertions after spec approval.
test('${name} scaffold renders accessible content', async ({ page }) => {
  const playground = await startStaticServer('apps/playground/dist')
  try {
    await page.goto(\`\${playground.url}/examples.html?id=${slug}/basic\`)
    await expect(page.locator('[data-${base}]')).toHaveText('${suffix} scaffold content')
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  } finally {
    await playground.close()
  }
})
`,
    ],
  ])

  // Validate the complete plan before writing: a partial collision must not
  // leave half a component or silently replace a contributor's existing work.
  for (const path of files.keys()) {
    try {
      await lstat(join(repositoryRoot, path))
    } catch (error) {
      if (error.code === 'ENOENT') continue
      throw error
    }
    throw new Error(`Refusing to overwrite ${path}`)
  }
  const familyRegistryPath = join(
    repositoryRoot,
    `packages/vue/registry/${slug}.registry.json`,
  )
  try {
    await lstat(familyRegistryPath)
    throw new Error(
      `Refusing to overwrite packages/vue/registry/${slug}.registry.json`,
    )
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }

  const familyRegistry = {
    schemaVersion: '1.0.0',
    slug,
    docs: {
      title: name,
      specStatus: 'draft',
      link: `/components/${slug}`,
      specLink: `/specs/${slug}`,
      category: 'utilities',
      sidebarLabel: suffix.replace(/([a-z])([A-Z])/g, '$1 $2'),
    },
    vueBarrel: [
      `export { default as ${name} } from './${name}.vue'`,
      `export { use${name}, type ${name}RootProps } from './use-${base}'`,
      `export type { ${name}Exposed } from './${base}'`,
    ],
    themesBarrel: [`export { ${name}, type ${name}Exposed } from './${base}'`],
    examples: [
      {
        id: `${slug}/basic`,
        title: `${suffix} scaffold`,
        description: 'Neutral scaffold; specification approval required.',
        layer: 'headless',
      },
    ],
  }
  files.set(
    `packages/vue/registry/${slug}.registry.json`,
    stableStringify(familyRegistry),
  )

  const primitivesPath = join(
    repositoryRoot,
    'packages/vue/registry/primitives.registry.json',
  )
  const primitives = JSON.parse(await readFile(primitivesPath, 'utf8'))
  if (primitives.familyOrder?.includes(slug)) {
    throw new Error(`${name} already exists in primitives.familyOrder`)
  }
  primitives.familyOrder ??= []
  primitives.familyOrder.push(slug)
  primitives.docsComponentNavOrder ??= []
  primitives.docsComponentNavOrder.push(slug)
  primitives.themesCssImports ??= []
  if (!primitives.themesCssImports.includes(`${base}.css`)) {
    primitives.themesCssImports.push(`${base}.css`)
  }
  const edits = new Map([
    [
      'packages/vue/registry/primitives.registry.json',
      stableStringify(primitives),
    ],
  ])

  // `pnpm size` fails for a component import without a budget. Seed generous
  // provisional budgets so the scaffold passes `pnpm verify`; re-baseline with
  // `pnpm size:write` once the approved implementation lands.
  const budgetsPath = join(repositoryRoot, BUNDLE_SIZE_BUDGETS_PATH)
  if (existsSync(budgetsPath)) {
    const budgets = JSON.parse(await readFile(budgetsPath, 'utf8'))
    for (const pkg of ['@ghostvue/vue', '@ghostvue/themes']) {
      const id = `${pkg}:${name}`
      if (id in budgets) {
        throw new Error(`${name} already has a bundle size budget (${id})`)
      }
      budgets[id] = SCAFFOLD_BUNDLE_BUDGET_BYTES
    }
    edits.set(BUNDLE_SIZE_BUDGETS_PATH, stableStringify(budgets))
  }

  for (const [path, source] of [...files, ...edits]) {
    if (!path.endsWith('.manifest.json')) {
      const filepath = join(repositoryRoot, path)
      const options = await resolveConfig(filepath)
      const formatted = await format(source, { ...options, filepath })
      if (files.has(path)) files.set(path, formatted)
      else edits.set(path, formatted)
    }
  }
  if (!dryRun) {
    for (const [path, source] of files) {
      await mkdir(dirname(join(repositoryRoot, path)), { recursive: true })
      await writeFile(join(repositoryRoot, path), source, { flag: 'wx' })
    }
    for (const [path, source] of edits)
      await writeFile(join(repositoryRoot, path), source)
    execPackageManagerSync('pnpm', ['registries:write'], {
      cwd: repositoryRoot,
      stdio: 'pipe',
    })
  }
  return {
    name,
    created: [...files.keys()],
    updated: [...edits.keys()],
    dryRun,
  }
}

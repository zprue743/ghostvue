import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { format, resolveConfig } from 'prettier'

import { pascalToKebab, serializeManifest } from './component-manifests.js'

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
    exposed:
      packageName === '@ghostvue/vue'
        ? [
            {
              name: 'element',
              kind: 'property',
              type: 'HTMLElement | null',
              description: 'Root element after mount; null before mount.',
            },
          ]
        : [],
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
      `import { defineComponent, h } from 'vue'

import { ${name} as GhostUnstyled${suffix} } from '@ghostvue/vue'

/** Themed scaffold; behavior remains in @ghostvue/vue. */
export const ${name} = defineComponent({
  name: '${name}',
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => h('span', { class: 'ghost-themed-scope' }, [
      h(GhostUnstyled${suffix}, attrs, slots),
    ])
  },
})
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
      serializeManifest(manifest(name, '@ghostvue/vue', slug)),
    ],
    [
      `packages/themes/manifests/${base}.manifest.json`,
      serializeManifest(manifest(name, '@ghostvue/themes', slug)),
    ],
    [
      `docs/components/${slug}.md`,
      `# ${name}

Scaffold only: a neutral content container with a default slot, native attribute
fallthrough, and a headless \`element\` ref. It does not implement ${suffix} widget
semantics. Complete and approve the [specification](./${slug}-spec.md) before
using it in production.

## Example

<GhostExample id="${slug}/basic" />

## API

No declared props or emits. The default slot holds content. The root has
\`data-part="root"\`, \`data-${base}\`, and class \`${base}\`.
The themed wrapper uses \`--ghost-surface-fg\`.

## Accessibility and follow-ups

The scaffold is a non-interactive div. Define keyboard behavior, roles, focus,
state, SSR requirements, and meaningful behavior tests in the specification.
`,
    ],
    [
      `docs/components/${slug}-spec.md`,
      `# ${name} specification

Status: draft; approval required before implementing production behavior.

Use the [component specification template](./spec-template.md) to resolve:

- Purpose, supported composition, and non-goals.
- Props, events, slots, exposed members, and state ownership.
- Native semantics, ARIA, keyboard, focus, disabled and loading behavior.
- SSR, hydration, async and error states, touch and reduced motion.
- Headless hooks, theme tokens, behavior tests, browser/Axe tests and type tests.

The generated neutral container is scaffolding, not an approved widget design.
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
  const edits = new Map()
  for (const [path, addition] of [
    [
      'packages/vue/src/index.ts',
      `\nexport { default as ${name} } from './${name}.vue'\nexport { use${name}, type ${name}RootProps } from './use-${base}'\nexport type { ${name}Exposed } from './${base}'\n`,
    ],
    ['packages/themes/src/index.ts', `\nexport { ${name} } from './${base}'\n`],
    ['packages/themes/src/default.css', `\n@import './${base}.css';\n`],
  ]) {
    const original = await readFile(join(repositoryRoot, path), 'utf8')
    if (
      new RegExp(`\\b${name}\\b`).test(original) ||
      original.includes(`./${base}.css`)
    ) {
      throw new Error(`${name} already exists in ${path}`)
    }
    edits.set(
      path,
      path.endsWith('.css')
        ? original.replace(/(?=@layer)/, `${addition.trim()}\n\n`)
        : original + addition,
    )
    if (path.endsWith('.css') && !original.includes('@layer'))
      throw new Error(`No CSS layer anchor in ${path}`)
  }
  const registryPath = 'examples/registry.ts'
  const registry = await readFile(join(repositoryRoot, registryPath), 'utf8')
  const anchor = '] as const satisfies readonly GhostExampleDefinition[]'
  if (!registry.includes(anchor) || registry.includes(`'${slug}/basic'`))
    throw new Error('Example registry anchor missing or id already exists.')
  edits.set(
    registryPath,
    registry.replace(
      anchor,
      `  { id: '${slug}/basic', title: '${suffix} scaffold', description: 'Neutral scaffold; specification approval required.', layer: 'headless' },\n${anchor}`,
    ),
  )
  const navPath = 'apps/docs/.vitepress/docs-nav.ts'
  const nav = await readFile(join(repositoryRoot, navPath), 'utf8')
  const marker = "text: 'Components',\n    items: ["
  if (!nav.includes(marker))
    throw new Error('Component sidebar anchor missing.')
  edits.set(
    navPath,
    nav.replace(
      marker,
      `${marker}\n      { text: '${name}', link: '/components/${slug}' },`,
    ),
  )

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
  }
  return {
    name,
    created: [...files.keys()],
    updated: [...edits.keys()],
    dryRun,
  }
}

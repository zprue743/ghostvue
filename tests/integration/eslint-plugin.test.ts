import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

import { Linter } from 'eslint'
import vue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import { describe, expect, it } from 'vitest'

import ghostvue from '../../packages/eslint-plugin/src/index.js'
import { lookupComponentContract } from '../../packages/eslint-plugin/src/component-index.js'
import * as themed from '../../packages/themes/src/index'
import * as headless from '../../packages/vue/src/index'

const repositoryRoot = process.cwd()

/** The configuration documented in docs/tooling/eslint-plugin.md. */
const config: Linter.Config[] = [
  ...vue.configs['flat/base'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  ghostvue.configs.recommended,
]

function lint(code: string, filename = 'Fixture.vue'): Linter.LintMessage[] {
  return new Linter().verify(code, config, filename)
}

async function collectVueFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    if (['node_modules', 'dist', 'cache'].includes(entry.name)) continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await collectVueFiles(path)))
    else if (entry.name.endsWith('.vue')) files.push(path)
  }
  return files
}

/** Runtime prop and v-model names a compiled component actually accepts. */
function runtimeContract(component: unknown): {
  props: string[]
  models: string[]
} {
  if (typeof component !== 'object' || component === null) {
    return { props: [], models: [] }
  }
  const props =
    'props' in component && component.props ? Object.keys(component.props) : []
  const emits = 'emits' in component ? component.emits : undefined
  const emitNames = Array.isArray(emits)
    ? emits.filter((name): name is string => typeof name === 'string')
    : emits && typeof emits === 'object'
      ? Object.keys(emits)
      : []
  const models = emitNames
    .filter((name) => name.startsWith('update:'))
    .map((name) => name.slice('update:'.length))
  return { props, models }
}

describe('@ghostvue/eslint-plugin', () => {
  it('reports no GhostVue usage errors across examples, playground, and docs SFCs', async () => {
    const files = [
      ...(await collectVueFiles(join(repositoryRoot, 'examples'))),
      ...(await collectVueFiles(join(repositoryRoot, 'apps/playground/src'))),
      ...(await collectVueFiles(join(repositoryRoot, 'apps/docs/.vitepress'))),
    ]
    expect(files.length).toBeGreaterThan(150)

    const problems: string[] = []
    for (const file of files) {
      const messages = lint(await readFile(file, 'utf8'), file)
      for (const message of messages) {
        problems.push(
          `${relative(repositoryRoot, file)}:${String(message.line)} ${message.ruleId ?? 'fatal'}: ${message.message}`,
        )
      }
    }
    expect(problems).toEqual([])
  })

  it('reports each rule through the recommended config with a TypeScript script', () => {
    const messages = lint(`<script setup lang="ts">
import { GhostButton, type GhostButtonType } from '@ghostvue/vue'
import { GhostDialog as Modal } from '@ghostvue/themes'
const kind: GhostButtonType = 'button'
</script>
<template>
  <GhostButton :type="kind" variant="soft" v-model="x" aria-label="Go" />
  <Modal v-model:open="open"><template #trigger>Open</template></Modal>
</template>
`)
    expect(
      messages.map(({ ruleId, line }) => `${ruleId ?? ''}@${String(line)}`),
    ).toEqual([
      'ghostvue/no-unknown-props@7',
      'ghostvue/no-undeclared-v-model@7',
      'ghostvue/no-unknown-slots@8',
    ])
  })

  it('ignores type-only imports', () => {
    expect(
      lint(`<script setup lang="ts">
import type { GhostButton } from '@ghostvue/vue'
import { type GhostInput } from '@ghostvue/themes'
</script>
<template><GhostButton varient="x" /><GhostInput>text</GhostInput></template>
`),
    ).toEqual([])
  })

  // Rules may only report what the component really rejects. If a manifest
  // drops a prop or model the runtime still declares, users would get false
  // errors, so the generated contracts must cover every runtime declaration.
  it.each([
    ['@ghostvue/vue', headless],
    ['@ghostvue/themes', themed],
  ] as const)(
    'covers every runtime prop and model of %s components',
    (packageName, module) => {
      const exports: Record<string, unknown> = { ...module }
      const gaps: string[] = []
      let checked = 0
      for (const [name, component] of Object.entries(exports)) {
        const contract = lookupComponentContract(packageName, name)
        if (!contract) continue
        checked += 1
        const runtime = runtimeContract(component)
        for (const prop of runtime.props) {
          if (!contract.props.includes(prop)) gaps.push(`${name} prop ${prop}`)
        }
        for (const model of runtime.models) {
          if (!contract.models.includes(model)) {
            gaps.push(`${name} model ${model}`)
          }
        }
      }
      expect(checked).toBeGreaterThan(40)
      expect(gaps).toEqual([])
    },
  )
})

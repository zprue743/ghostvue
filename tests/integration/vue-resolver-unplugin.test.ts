/**
 * End-to-end check of `GhostVueResolver()` inside the real
 * `unplugin-vue-components` Vite plugin: a template that imports nothing must
 * compile to a named import from `@ghostvue/vue`, then render on the server and
 * hydrate without mismatches. `unplugin-vue-components` is a root development
 * dependency only; `@ghostvue/vue` never imports it.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import type { ComponentResolver } from 'unplugin-vue-components'
import { build } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Component } from 'vue'

import { GhostVueResolver } from '../../packages/vue/src/resolver'
import { expectSsrHydration } from '../support/ssr-hydration'

const repositoryRoot = process.cwd()

const consumerSfc = `<script setup lang="ts">
import { ref } from 'vue'

const checked = ref(false)
</script>

<template>
  <div>
    <GhostButton type="submit">Save</GhostButton>
    <label for="wifi">Wi-Fi</label>
    <GhostSwitch id="wifi" v-model="checked" />
    <GhostVisuallyHidden>Status: {{ checked ? 'on' : 'off' }}</GhostVisuallyHidden>
  </div>
</template>
`

describe('GhostVueResolver with unplugin-vue-components', () => {
  let workDir = ''
  let bundle = ''
  let bundlePath = ''

  beforeAll(async () => {
    const cacheDir = resolve(repositoryRoot, 'packages/vue/.cache')
    await mkdir(cacheDir, { recursive: true })
    workDir = await mkdtemp(join(cacheDir, 'resolver-unplugin-'))
    await writeFile(join(workDir, 'Consumer.vue'), consumerSfc)

    await build({
      configFile: false,
      root: workDir,
      logLevel: 'silent',
      plugins: [
        vue(),
        Components({
          // Only the resolver may supply components: no directory scanning
          // and no generated declaration file.
          dirs: [],
          dts: false,
          resolvers: [GhostVueResolver()],
        }),
      ],
      build: {
        outDir: join(workDir, 'dist'),
        emptyOutDir: true,
        minify: false,
        lib: {
          entry: join(workDir, 'Consumer.vue'),
          formats: ['es'],
          fileName: 'consumer',
        },
        rollupOptions: { external: ['vue', '@ghostvue/vue'] },
      },
    })
    bundlePath = join(workDir, 'dist/consumer.js')
    bundle = await readFile(bundlePath, 'utf8')
  }, 60_000)

  afterAll(async () => {
    if (workDir) await rm(workDir, { recursive: true, force: true })
  })

  it('satisfies the plugin resolver type without a runtime dependency', () => {
    const resolver: ComponentResolver = GhostVueResolver()
    expect(resolver).toMatchObject({ type: 'component' })
  })

  it('rewrites Ghost* tags to named imports from @ghostvue/vue', () => {
    const imports = [
      ...bundle.matchAll(
        /import\s*\{([^}]*)\}\s*from\s*["']@ghostvue\/vue["']/g,
      ),
    ]
      .flatMap((match) => (match[1] ?? '').split(','))
      .map((specifier) => specifier.trim().split(/\s+as\s+/)[0])
    expect(imports).toEqual(
      expect.arrayContaining([
        'GhostButton',
        'GhostSwitch',
        'GhostVisuallyHidden',
      ]),
    )
    // Nothing fell back to runtime resolution of an unknown component.
    expect(bundle).not.toContain('resolveComponent("Ghost')
  })

  it('renders on the server and hydrates without mismatches', async () => {
    // Vitest resolves the externalized `@ghostvue/vue` to package source.
    const module = (await import(/* @vite-ignore */ bundlePath)) as {
      default: Component
    }
    const { html } = await expectSsrHydration(module.default, {
      assertServerHtml: (serverHtml) => {
        expect(serverHtml).toContain('class="ghost-button"')
        expect(serverHtml).toContain('role="switch"')
      },
    })
    expect(html).toContain('Status: off')
  })
})

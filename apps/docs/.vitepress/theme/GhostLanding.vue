<script setup lang="ts">
import { GhostButton as HeadlessGhostButton } from '@ghostvue/vue'
import {
  GhostButton as ThemedGhostButton,
  GhostTabs,
  GhostTabsContent,
  GhostTabsList,
  GhostTabsTrigger,
} from '@ghostvue/themes'
import { computed, onMounted, onUnmounted, ref } from 'vue'

import { exampleSource } from '../../../../examples/load'
import LandingActionLink from './LandingActionLink.vue'
import { landingComponentSurface } from './landing-surface'

const headlessSource = `import { GhostButton } from '@ghostvue/vue'

<GhostButton :loading="pending">Save changes</GhostButton>
<GhostButton>Cancel</GhostButton>
<GhostButton disabled>Disabled</GhostButton>`

const themedSource = `import { GhostButton } from '@ghostvue/themes'

<GhostButton :loading="pending">Save changes</GhostButton>
<GhostButton variant="soft">Soft</GhostButton>
<GhostButton variant="outline">Outline</GhostButton>
<GhostButton variant="ghost" tone="danger">Danger</GhostButton>`

const stageTitles = [
  'Props and configuration',
  'Controllable state and callbacks',
  'Slots and marked parts',
  'Lower-level primitives',
] as const

const stageCodes = [
  '<GhostButton>',
  'v-model:open',
  'data-part',
  'useGhostButton()',
] as const

const stages = [
  {
    id: 'props',
    file: 'examples/button/themed.vue',
    note: 'Safe default type="button"; preserves focus when loading',
    sourceId: 'button/themed',
  },
  {
    id: 'controlled',
    file: 'examples/popover/basic.vue',
    note: 'Works controlled (v-model:open) or uncontrolled (defaultOpen)',
    sourceId: 'popover/basic',
  },
  {
    id: 'slots',
    file: 'examples/button/loading.vue',
    note: 'Slot content owns icons and custom loading indicators via data-part',
    sourceId: 'button/loading',
  },
  {
    id: 'composable',
    file: 'examples/button/composable.vue',
    note: 'Attach behavior directly to custom elements without wrapper SFCs',
    sourceId: 'button/composable',
  },
] as const

const pending = ref(false)
const progressionStage = ref<(typeof stages)[number]['id']>('props')
const activeDocsTheme = ref('calm')

const surfaceRows = landingComponentSurface()

let themeObserver: MutationObserver | undefined
const themeMetaLabel = computed(
  () => `@ghostvue/themes · ${activeDocsTheme.value}`,
)

function togglePending(): void {
  pending.value = !pending.value
}

function readDocsTheme(): void {
  const theme = document.documentElement.getAttribute('data-ghost-theme')
  activeDocsTheme.value = theme ?? 'calm'
}

onMounted(() => {
  readDocsTheme()
  themeObserver = new MutationObserver(() => {
    readDocsTheme()
  })
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-ghost-theme'],
  })
})

onUnmounted(() => {
  themeObserver?.disconnect()
})
</script>

<template>
  <main class="ghost-landing" aria-labelledby="ghost-landing-title">
    <section class="ghost-landing__hero">
      <div class="ghost-landing__hero-mark">
        <svg
          width="48"
          height="48"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="GhostVue Phantom V logo"
        >
          <path
            d="M32 8C19.85 8 10 17.85 10 30V54L17.33 47.5L24.67 54L32 47.5L39.33 54L46.67 47.5L54 54V30C54 17.85 44.15 8 32 8Z"
            fill="var(--ghost-action-primary-bg)"
            fill-opacity="0.18"
            stroke="var(--ghost-action-primary-bg)"
            stroke-width="3"
            stroke-linejoin="round"
          />
          <path
            d="M20 24L32 44L44 24H36.5L32 32L27.5 24H20Z"
            fill="var(--ghost-action-primary-bg)"
          />
          <circle cx="24.5" cy="18.5" r="2.2" fill="var(--ghost-surface-fg)" />
          <circle cx="39.5" cy="18.5" r="2.2" fill="var(--ghost-surface-fg)" />
        </svg>
      </div>

      <h1 id="ghost-landing-title" class="ghost-landing__title">
        Vue-first, headless-first UI.
      </h1>
      <p class="ghost-landing__tagline">
        Unstyled, accessible Vue primitives in <code>@ghostvue/vue</code>.
        Optional, contrast-tested OKLCH stylesheets in
        <code>@ghostvue/themes</code>.
      </p>
      <div class="ghost-landing__actions">
        <LandingActionLink href="/getting-started">
          Get started
        </LandingActionLink>
        <LandingActionLink href="/components/button" variant="outline">
          Browse components
        </LandingActionLink>
        <a href="/getting-started" class="ghost-landing__install">
          <code>Pre-release — install once published</code>
        </a>
      </div>
    </section>

    <section
      aria-label="Headless versus themed comparison"
      class="ghost-landing__comparison"
    >
      <figure class="ghost-landing-example">
        <figcaption class="ghost-landing-example__header">
          <span class="ghost-landing-example__title">Headless primitive</span>
          <span class="ghost-landing-example__meta">@ghostvue/vue</span>
        </figcaption>
        <div
          class="ghost-landing-example__preview ghost-landing-example__preview--headless"
        >
          <p class="ghost-landing-example__hint">Unstyled. Headless.</p>
          <HeadlessGhostButton :loading="pending" @click="togglePending">
            {{ pending ? 'Saving…' : 'Save changes' }}
          </HeadlessGhostButton>
          <HeadlessGhostButton>Cancel</HeadlessGhostButton>
          <HeadlessGhostButton disabled>Disabled</HeadlessGhostButton>
        </div>
        <pre class="ghost-landing-example__code" tabindex="0">
<code>{{ headlessSource }}</code></pre>
      </figure>

      <figure class="ghost-landing-example">
        <figcaption class="ghost-landing-example__header">
          <span class="ghost-landing-example__title">Themed wrapper</span>
          <span class="ghost-landing-example__meta">{{ themeMetaLabel }}</span>
        </figcaption>
        <div class="ghost-landing-example__preview ghost-themed-scope">
          <ThemedGhostButton :loading="pending" @click="togglePending">
            {{ pending ? 'Saving…' : 'Save changes' }}
          </ThemedGhostButton>
          <ThemedGhostButton variant="soft">Soft</ThemedGhostButton>
          <ThemedGhostButton variant="outline">Outline</ThemedGhostButton>
          <ThemedGhostButton variant="ghost" tone="danger">
            Danger
          </ThemedGhostButton>
        </div>
        <pre class="ghost-landing-example__code" tabindex="0">
<code>{{ themedSource }}</code></pre>
      </figure>
    </section>

    <section id="progression" class="ghost-landing__section">
      <h2>Progressive escape hatches</h2>
      <p>
        Simple use should look simple; consumers meet complexity only when their
        interface requires it. Configuration describes intent—not the library's
        nested DOM.
      </p>
      <GhostTabs
        v-model="progressionStage"
        orientation="vertical"
        class="ghost-landing__progression-tabs ghost-themed-scope"
      >
        <div class="ghost-landing__progression-layout">
          <GhostTabsList aria-label="Progressive escape hatch examples">
            <GhostTabsTrigger
              v-for="(stage, index) in stages"
              :key="stage.id"
              :value="stage.id"
              class="ghost-landing__progression-trigger"
            >
              <span>{{ index + 1 }}. {{ stageTitles[index] }}</span>
              <code>{{ stageCodes[index] }}</code>
            </GhostTabsTrigger>
          </GhostTabsList>
          <GhostTabsContent
            v-for="stage in stages"
            :key="stage.id"
            :value="stage.id"
            class="ghost-landing__progression-panel"
          >
            <div class="ghost-landing__code-window">
              <div class="ghost-landing__code-window-bar">
                <span class="ghost-landing__code-window-file">{{
                  stage.file
                }}</span>
                <span>{{ stage.note }}</span>
              </div>
              <pre
                tabindex="0"
              ><code>{{ exampleSource(stage.sourceId) }}</code></pre>
            </div>
          </GhostTabsContent>
        </div>
      </GhostTabs>
    </section>

    <section id="principles" class="ghost-landing__section">
      <h2>Engineering commitments</h2>
      <div class="ghost-landing__principles">
        <article class="ghost-landing__principle">
          <h3>Headless never depends on themes</h3>
          <p>
            <code>@ghostvue/vue</code> has no dependency edge to
            <code>@ghostvue/themes</code>. Theme recipes compile into
            <code>@layer ghostvue-theme</code> using zero-specificity
            <code>:where()</code> selectors, so application CSS always wins.
          </p>
        </article>
        <article class="ghost-landing__principle">
          <h3>Contrast-checked token pipeline</h3>
          <p>
            <code>defineTheme</code> compiles DTCG seeds into independently
            tuned light and dark OKLCH ramps. It walks foreground steps and
            throws at build time if any evaluated pair fails WCAG 2 AA contrast.
          </p>
        </article>
        <article class="ghost-landing__principle">
          <h3>Gated components and manifests</h3>
          <p>
            Production components ship only with an approved specification, unit
            and Playwright + axe tests, typed examples under
            <code>examples/</code>, a machine-readable
            <code>.manifest.json</code>, and <code>/llms.txt</code> output.
          </p>
        </article>
      </div>
    </section>

    <section id="surface" class="ghost-landing__section">
      <h2>Current public surface</h2>
      <p>
        {{ surfaceRows.length }} documented components on <code>master</code>,
        generated from component manifests and the docs catalog. Composable
        exports and roadmap sequencing live in the
        <a href="/roadmap">component roadmap</a>.
      </p>

      <div class="ghost-landing__ledger-wrap">
        <table class="ghost-landing__ledger">
          <thead>
            <tr>
              <th scope="col">Export</th>
              <th scope="col">Package</th>
              <th scope="col">Responsibility</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in surfaceRows" :key="row.exportName">
              <td>
                <a :href="row.link">{{ row.exportName }}</a>
              </td>
              <td>{{ row.pkg }}</td>
              <td>{{ row.description }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <footer id="prerelease" class="ghost-landing__footnote">
      <span>
        <strong>Pre-release:</strong> GhostVue is under active development.
        Adding or promoting a component requires the
        <a href="/agents/COMPONENT_WORKFLOW">component gate</a>.
      </span>
      <span>
        <a href="/llms.txt">/llms.txt</a> ·
        <a href="/llms-full.txt">/llms-full.txt</a> ·
        <a href="https://github.com/zprue743/ghostvue">GitHub</a>
      </span>
    </footer>
  </main>
</template>

<style scoped src="./landing-page.css"></style>

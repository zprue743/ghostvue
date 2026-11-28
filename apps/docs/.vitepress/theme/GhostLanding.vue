<script setup lang="ts">
import {
  GhostBadge,
  GhostCard,
  GhostInlineAlert,
  GhostLink,
  GhostSegmentedControl,
  GhostSegmentedControlItem,
  GhostSwitch,
  GhostTabs,
  GhostTabsContent,
  GhostTabsList,
  GhostTabsTrigger,
} from '@ghostvue/themes'
import { useData, withBase } from 'vitepress'
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
  type Component,
} from 'vue'

import { exampleLoader, exampleSource } from '../../../../examples/load'
import { defineDemoPreview } from './demo-preview-async'
import { runDocsViewTransition, switchDocsTheme } from './docs-theme-transition'
import LandingHeroMark from './LandingHeroMark.vue'
import { useLandingScroll, type LandingSectionId } from './landing-motion'
import { landingProgressionStages } from './landing-progression'
import LandingSectionNumber from './LandingSectionNumber.vue'
import LandingSectionRail from './LandingSectionRail.vue'
import {
  landingCatalog,
  landingComponentCount,
  landingManifestExcerpt,
} from './landing-surface'
import {
  DOCS_DEFAULT_THEME,
  DOCS_THEME_OPTIONS,
  isDocsThemeName,
  type DocsThemeName,
} from './restore-theme'

/*
 * Docs home page. Every showcase mounts a typed example SFC from `examples/`
 * through the same lazy loader as `<GhostExample>`, so the page demonstrates
 * the library with the code the component docs already publish.
 *
 * Section motion lives in `landing-page.css` (CSS scroll-driven animations)
 * with `useLandingScroll` as the fallback for section phases; the rail uses
 * `GhostScrollSpy`. The server render and the no-JavaScript page show every
 * section in its final state.
 */

/** Lazy live demo for an example id; an unknown id fails the docs build. */
function liveExample(id: string): Component {
  const loader = exampleLoader(id)
  if (!loader) {
    throw new Error(
      `Unknown example "${id}" on the landing page. Add ${id}.vue under examples/.`,
    )
  }
  return defineDemoPreview(loader)
}

/* Hero: a cluster of themed examples, one per column. */
const heroCluster = [
  { id: 'badge/release-channels', reveal: 'left' },
  { id: 'segmented-control/analytics-period', reveal: 'rise' },
  { id: 'kbd/command-shortcuts', reveal: 'right' },
].map((entry) => ({ ...entry, demo: liveExample(entry.id) }))

/* Headless or themed: the same component from each package. */
const layerPairs = [
  { id: 'tabs', label: 'Tabs', component: 'GhostTabs' },
  { id: 'switch', label: 'Switch', component: 'GhostSwitch' },
  { id: 'checkbox', label: 'Checkbox', component: 'GhostCheckbox' },
  { id: 'button', label: 'Button', component: 'GhostButton' },
].map((pair) => ({
  ...pair,
  headless: liveExample(`${pair.id}/basic`),
  themed: liveExample(`${pair.id}/themed`),
}))

const layerId = ref('tabs')
const activeLayer = computed(
  () => layerPairs.find((pair) => pair.id === layerId.value) ?? layerPairs[0],
)

/* Progressive escape hatches: one example source per stage. */
const stages = landingProgressionStages

const progressionStage = ref<(typeof stages)[number]['id']>('props')

/* Theming: the flagship switch drives the same state as the nav switcher. */
const themeLabels: Record<DocsThemeName, string> = {
  default: 'Default',
  calm: 'Calm',
  vibrant: 'Vibrant',
  mono: 'Mono',
}

const themeSwatches = [
  { token: '--ghost-action-primary-bg', label: 'Primary action' },
  { token: '--ghost-surface-subtle-bg', label: 'Subtle surface' },
  { token: '--ghost-border-strong', label: 'Strong border' },
  { token: '--ghost-status-success-fg', label: 'Success' },
  { token: '--ghost-status-warning-fg', label: 'Warning' },
  { token: '--ghost-action-danger-bg', label: 'Danger action' },
] as const

const themeDemos = ['slider/audio-mixer', 'progress/upload-queue'].map(
  (id) => ({ id, demo: liveExample(id) }),
)

const { isDark } = useData()
const themeName = ref<DocsThemeName>(DOCS_DEFAULT_THEME)
/*
 * Mirrors VitePress appearance. It starts `false` to match the server render
 * and is corrected after mount, so the switch never hydrates with a mismatch.
 */
const darkMode = ref(false)
let themeObserver: MutationObserver | undefined

function readDocsTheme(): void {
  const value = document.documentElement.getAttribute('data-ghost-theme')
  themeName.value = value && isDocsThemeName(value) ? value : DOCS_DEFAULT_THEME
}

function applyDocsTheme(next: string): void {
  if (!isDocsThemeName(next)) return
  // The control follows the choice at once. The attribute itself is written
  // a frame later, inside the crossfade.
  themeName.value = next
  switchDocsTheme(next)
}

function setDarkMode(next: boolean): void {
  runDocsViewTransition(async () => {
    isDark.value = next
    // VitePress applies the appearance class when Vue flushes, and the docs
    // theme mirrors it to `data-ghost-mode` from there. The transition must
    // not take its "after" snapshot before both have landed.
    await nextTick()
  })
}

watch(isDark, (next) => {
  darkMode.value = next
})

/* Component surface: the published catalog, one tab per category. */
const catalog = landingCatalog().map((group) => ({
  ...group,
  demo: liveExample(group.featuredExample),
}))
const componentCount = landingComponentCount()
const catalogGroup = ref(catalog[0]?.key ?? '')

/* Agents and tooling. */
const manifestExcerpt = landingManifestExcerpt()

const tooling = [
  {
    title: 'Component manifests',
    body: 'Every component ships a JSON manifest of its props, models, events, slots, parts, and accessibility contract. Docs, lint rules, and agents read the same file.',
    href: '/architecture/component-manifest',
    link: 'Manifest schema',
  },
  {
    title: 'MCP server',
    body: 'A local, read-only Model Context Protocol server lets coding agents list components and fetch manifests, example source, docs, and tokens without guessing.',
    href: '/tooling/mcp-server',
    link: 'Set up @ghostvue/mcp',
  },
  {
    title: 'ESLint plugin',
    body: 'Template rules check props, slots, and v-model bindings against the manifests, so a wrong usage is reported in the editor instead of at runtime.',
    href: '/tooling/eslint-plugin',
    link: 'Configure the rules',
  },
  {
    title: 'Nuxt auto-imports',
    body: 'The Nuxt module auto-imports headless components and composables. Themed components and their CSS reach your app only when you opt in.',
    href: '/auto-imports',
    link: 'Nuxt and auto-imports',
  },
] as const

const { motionMode } = useLandingScroll()
const activeId = ref<LandingSectionId>('hero')

onMounted(() => {
  readDocsTheme()
  darkMode.value = isDark.value
  // The nav theme switcher writes the same attribute; stay in step with it.
  themeObserver = new MutationObserver(readDocsTheme)
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
  <!--
    Density is pinned for the whole page. `calm`, the docs default, is the
    only flagship whose unset density is compact, so without the pin every
    themed component on the page changed size when the reader switched theme
    in the theming section, and the page moved under them. Compact keeps the
    first view (calm) exactly as it was.
  -->
  <div
    ref="root"
    class="ghost-landing"
    data-ghost-density="compact"
    :data-landing-motion="motionMode"
  >
    <LandingSectionRail v-model="activeId" />

    <main class="ghost-landing__main">
      <!-- 1. Hero -->
      <section
        id="hero"
        class="ghost-landing__section ghost-landing__section--hero"
        aria-labelledby="ghost-landing-title"
        tabindex="-1"
      >
        <div class="ghost-landing__inner">
          <div class="ghost-landing__hero-copy" data-reveal="lift">
            <LandingHeroMark
              :active="activeId === 'hero'"
              :motion-mode="motionMode"
            />
            <GhostBadge variant="outline" tone="accent" size="md">
              Pre-1.0 · on npm
            </GhostBadge>
            <h1 id="ghost-landing-title" class="ghost-landing__title">
              Vue-first, headless-first UI.
            </h1>
            <p class="ghost-landing__tagline">
              Unstyled, accessible Vue primitives in <code>@ghostvue/vue</code>.
              Optional, contrast-tested OKLCH stylesheets in
              <code>@ghostvue/themes</code>.
            </p>
            <div class="ghost-landing__actions">
              <GhostLink
                :href="withBase('/getting-started')"
                appearance="button"
                size="lg"
              >
                Get started
              </GhostLink>
              <GhostLink
                :href="withBase('/components/')"
                appearance="button"
                variant="outline"
                size="lg"
              >
                Browse components
              </GhostLink>
            </div>
          </div>

          <div
            class="ghost-landing__cluster"
            role="group"
            aria-label="Live component examples"
          >
            <div
              v-for="entry in heroCluster"
              :key="entry.id"
              class="ghost-landing__cluster-item ghost-example__preview"
              :data-reveal="entry.reveal"
              :data-landing-example="entry.id"
            >
              <component :is="entry.demo" />
            </div>
          </div>
        </div>
      </section>

      <!-- 2. Headless or themed -->
      <section
        id="layers"
        class="ghost-landing__section ghost-landing__section--layers"
        aria-labelledby="landing-layers-title"
        tabindex="-1"
      >
        <div class="ghost-landing__inner">
          <header class="ghost-landing__header" data-reveal="rise">
            <p class="ghost-landing__eyebrow">Two layers, one API</p>
            <h2 id="landing-layers-title">Adopt headless or themed</h2>
            <p>
              Both packages export the same component names and the same
              accessibility behavior. Bring your own design system with
              <code>@ghostvue/vue</code>, or start styled with
              <code>@ghostvue/themes</code> and switch layers one component at a
              time.
            </p>
            <GhostSegmentedControl
              v-model="layerId"
              aria-label="Component to compare"
              class="ghost-landing__layer-picker"
            >
              <GhostSegmentedControlItem
                v-for="pair in layerPairs"
                :key="pair.id"
                :value="pair.id"
              >
                {{ pair.label }}
              </GhostSegmentedControlItem>
            </GhostSegmentedControl>
          </header>

          <div v-if="activeLayer" class="ghost-landing__layers">
            <GhostCard
              class="ghost-landing__layer"
              data-reveal="left"
              data-landing-layer="headless"
            >
              <template #header>
                <div class="ghost-landing__layer-header">
                  <span class="ghost-landing__layer-title">
                    Headless primitive
                  </span>
                  <GhostBadge variant="outline" tone="neutral">
                    @ghostvue/vue
                  </GhostBadge>
                </div>
              </template>
              <div class="ghost-landing__stage ghost-example__preview">
                <component :is="activeLayer.headless" :key="activeLayer.id" />
              </div>
              <template #footer>
                <code class="ghost-landing__import">
                  import { {{ activeLayer.component }} } from '@ghostvue/vue'
                </code>
              </template>
            </GhostCard>

            <GhostCard
              class="ghost-landing__layer"
              data-reveal="right"
              data-landing-layer="themed"
            >
              <template #header>
                <div class="ghost-landing__layer-header">
                  <span class="ghost-landing__layer-title">Themed wrapper</span>
                  <GhostBadge variant="soft" tone="accent">
                    @ghostvue/themes · {{ themeName }}
                  </GhostBadge>
                </div>
              </template>
              <div class="ghost-landing__stage ghost-example__preview">
                <component :is="activeLayer.themed" :key="activeLayer.id" />
              </div>
              <template #footer>
                <code class="ghost-landing__import">
                  import { {{ activeLayer.component }} } from '@ghostvue/themes'
                </code>
              </template>
            </GhostCard>
          </div>
        </div>
      </section>

      <!-- 3. Progressive escape hatches -->
      <section
        id="progression"
        class="ghost-landing__section ghost-landing__section--progression"
        aria-labelledby="landing-progression-title"
        tabindex="-1"
      >
        <div class="ghost-landing__inner">
          <header class="ghost-landing__header" data-reveal="rise">
            <p class="ghost-landing__eyebrow">Complexity on demand</p>
            <h2 id="landing-progression-title">Progressive escape hatches</h2>
            <p>
              Simple use should look simple; consumers meet complexity only when
              their interface requires it. Configuration describes intent, not
              the library's nested DOM.
            </p>
          </header>

          <GhostTabs v-model="progressionStage" orientation="vertical">
            <div class="ghost-landing__progression-layout">
              <div data-reveal="left" data-reveal-step="1">
                <GhostTabsList aria-label="Progressive escape hatch examples">
                  <GhostTabsTrigger
                    v-for="(stage, index) in stages"
                    :key="stage.id"
                    :value="stage.id"
                  >
                    <span>{{ index + 1 }}. {{ stage.title }}</span>
                    <code>{{ stage.code }}</code>
                  </GhostTabsTrigger>
                </GhostTabsList>
              </div>
              <div data-reveal="tilt" data-reveal-step="2">
                <GhostTabsContent
                  v-for="stage in stages"
                  :key="stage.id"
                  :value="stage.id"
                >
                  <GhostCard class="ghost-landing__code-window">
                    <template #header>
                      <div class="ghost-landing__code-window-bar">
                        <span class="ghost-landing__code-window-file">{{
                          stage.file
                        }}</span>
                        <span>{{ stage.note }}</span>
                      </div>
                    </template>
                    <pre
                      tabindex="0"
                    ><code>{{ exampleSource(stage.sourceId) }}</code></pre>
                  </GhostCard>
                </GhostTabsContent>
              </div>
            </div>
          </GhostTabs>
        </div>
      </section>

      <!-- 4. Theming -->
      <section
        id="theming"
        class="ghost-landing__section ghost-landing__section--theming"
        aria-labelledby="landing-theming-title"
        tabindex="-1"
      >
        <div class="ghost-landing__inner ghost-landing__split">
          <div class="ghost-landing__theming-copy">
            <header class="ghost-landing__header" data-reveal="rise">
              <p class="ghost-landing__eyebrow">Contrast-checked tokens</p>
              <h2 id="landing-theming-title">Retheme without rewrites</h2>
              <p>
                <code>defineTheme</code> compiles a brand colour into
                independently tuned light and dark OKLCH ramps and fails the
                build if a text pair misses WCAG 2 AA. Recipes sit in
                <code>@layer ghostvue-theme</code> behind zero-specificity
                selectors, so your CSS always wins.
              </p>
            </header>

            <GhostCard data-reveal="rise" data-reveal-step="1">
              <div class="ghost-landing__theme-controls">
                <div class="ghost-landing__theme-control">
                  <span id="landing-theme-label">Flagship theme</span>
                  <GhostSegmentedControl
                    :model-value="themeName"
                    aria-labelledby="landing-theme-label"
                    @update:model-value="applyDocsTheme"
                  >
                    <GhostSegmentedControlItem
                      v-for="name in DOCS_THEME_OPTIONS"
                      :key="name"
                      :value="name"
                    >
                      {{ themeLabels[name] }}
                    </GhostSegmentedControlItem>
                  </GhostSegmentedControl>
                </div>
                <div
                  class="ghost-landing__theme-control ghost-landing__theme-control--inline"
                >
                  <label for="landing-dark-mode">Dark appearance</label>
                  <GhostSwitch
                    id="landing-dark-mode"
                    :model-value="darkMode"
                    @update:model-value="setDarkMode"
                  />
                </div>
                <ul
                  class="ghost-landing__swatches"
                  aria-label="Semantic colour tokens in the current theme"
                >
                  <li
                    v-for="swatch in themeSwatches"
                    :key="swatch.token"
                    class="ghost-landing__swatch"
                  >
                    <!--
                      Bespoke: a colour chip has no GhostVue component. The
                      label carries the meaning; the chip is decorative.
                    -->
                    <span
                      class="ghost-landing__swatch-chip"
                      aria-hidden="true"
                      :style="{ background: `var(${swatch.token})` }"
                    ></span>
                    <span>{{ swatch.label }}</span>
                  </li>
                </ul>
                <GhostLink href="/themes/define-theme">
                  Flagships and defineTheme
                </GhostLink>
              </div>
            </GhostCard>
          </div>

          <div class="ghost-landing__theme-demos">
            <div
              v-for="(entry, index) in themeDemos"
              :key="entry.id"
              class="ghost-landing__stage ghost-landing__stage--bare ghost-example__preview"
              data-reveal="swing"
              :data-reveal-step="index + 1"
              :data-landing-example="entry.id"
            >
              <component :is="entry.demo" />
            </div>
          </div>
        </div>
      </section>

      <!-- 5. Component surface -->
      <section
        id="components"
        class="ghost-landing__section ghost-landing__section--components"
        aria-labelledby="landing-components-title"
        tabindex="-1"
      >
        <div class="ghost-landing__inner">
          <header class="ghost-landing__header" data-reveal="rise">
            <p class="ghost-landing__eyebrow">
              {{ componentCount }} documented components
            </p>
            <h2 id="landing-components-title">One catalogue, every layer</h2>
            <p>
              Each page documents headless behavior, themed recipes, keyboard
              support, and runnable examples. Upcoming primitives are tracked in
              the <GhostLink href="/roadmap">component roadmap</GhostLink>.
            </p>
          </header>

          <GhostTabs v-model="catalogGroup">
            <div class="ghost-landing__catalog">
              <div data-reveal="rise" data-reveal-step="1">
                <GhostTabsList aria-label="Component categories">
                  <GhostTabsTrigger
                    v-for="group in catalog"
                    :key="group.key"
                    :value="group.key"
                  >
                    {{ group.label }}
                  </GhostTabsTrigger>
                </GhostTabsList>
              </div>
              <GhostTabsContent
                v-for="group in catalog"
                :key="group.key"
                :value="group.key"
              >
                <div class="ghost-landing__catalog-panel">
                  <div
                    class="ghost-landing__stage ghost-landing__stage--fill ghost-example__preview"
                    data-reveal="zoom"
                    data-reveal-step="2"
                    :data-landing-example="group.featuredExample"
                  >
                    <component :is="group.demo" />
                  </div>
                  <ul
                    class="ghost-landing__tiles"
                    data-reveal="cascade"
                    data-reveal-step="2"
                  >
                    <li v-for="item in group.items" :key="item.link">
                      <GhostCard
                        as="a"
                        :href="item.link"
                        interactive="spotlight"
                        class="ghost-landing__tile"
                      >
                        <span class="ghost-landing__tile-title">{{
                          item.label
                        }}</span>
                        <span class="ghost-landing__tile-summary">{{
                          item.summary
                        }}</span>
                      </GhostCard>
                    </li>
                  </ul>
                </div>
              </GhostTabsContent>
            </div>
          </GhostTabs>

          <div class="ghost-landing__section-actions" data-reveal="rise">
            <GhostLink
              :href="withBase('/components/')"
              appearance="button"
              variant="soft"
            >
              Browse all {{ componentCount }} components
            </GhostLink>
          </div>
        </div>
      </section>

      <!-- 6. Agents and tooling -->
      <section
        id="tooling"
        class="ghost-landing__section ghost-landing__section--tooling"
        aria-labelledby="landing-tooling-title"
        tabindex="-1"
      >
        <div class="ghost-landing__inner ghost-landing__split">
          <div>
            <header class="ghost-landing__header" data-reveal="rise">
              <p class="ghost-landing__eyebrow">Machine-readable by design</p>
              <h2 id="landing-tooling-title">Built for agents and tooling</h2>
              <p>
                The contract people read in the docs is the same one your
                editor, your linter, and your coding agent read. Nothing is
                inferred from rendered markup.
              </p>
            </header>
            <GhostCard
              class="ghost-landing__code-window"
              data-reveal="left"
              data-reveal-step="1"
            >
              <template #header>
                <div class="ghost-landing__code-window-bar">
                  <span class="ghost-landing__code-window-file">
                    ghost-button.manifest.json
                  </span>
                  <span>Excerpt of the generated manifest</span>
                </div>
              </template>
              <pre tabindex="0"><code>{{ manifestExcerpt }}</code></pre>
            </GhostCard>
          </div>

          <ul class="ghost-landing__tooling">
            <li
              v-for="(tool, index) in tooling"
              :key="tool.href"
              data-reveal="right"
              :data-reveal-step="index < 2 ? 1 : 2"
            >
              <GhostCard class="ghost-landing__tool">
                <h3>{{ tool.title }}</h3>
                <p>{{ tool.body }}</p>
                <template #footer>
                  <GhostLink :href="tool.href" variant="subtle">
                    {{ tool.link }}
                  </GhostLink>
                </template>
              </GhostCard>
            </li>
          </ul>
        </div>
      </section>

      <!-- 7. Closing call to action -->
      <section
        id="get-started"
        class="ghost-landing__section ghost-landing__section--closing"
        aria-labelledby="landing-closing-title"
        tabindex="-1"
      >
        <div class="ghost-landing__inner ghost-landing__closing">
          <header class="ghost-landing__header" data-reveal="zoom">
            <h2 id="landing-closing-title">Start with one component.</h2>
            <p>
              Install GhostVue from npm and try a button, dialog, or table in
              your Vue app.
            </p>
            <div class="ghost-landing__closing-actions">
              <GhostLink
                :href="withBase('/getting-started')"
                appearance="button"
                size="lg"
              >
                Read the guide
              </GhostLink>
              <GhostLink
                :href="withBase('/philosophy')"
                appearance="button"
                variant="outline"
                size="lg"
              >
                Why GhostVue
              </GhostLink>
            </div>
          </header>

          <div
            class="ghost-landing__closing-notice"
            data-reveal="rise"
            data-reveal-step="1"
          >
            <GhostInlineAlert tone="accent" variant="soft" :heading-level="3">
              <template #title>Pre-1.0 development</template>
              <template #message>
                GhostVue is published on npm. Minor releases may include
                breaking API changes.
              </template>
              <template #actions>
                <div class="ghost-landing__notice-actions">
                  <GhostLink href="/getting-started"
                    >Install GhostVue</GhostLink
                  >
                  <GhostLink href="/contributing/workflow">
                    Contribute
                  </GhostLink>
                </div>
              </template>
            </GhostInlineAlert>
          </div>

          <p class="ghost-landing__footnote" data-reveal="rise">
            <GhostLink href="/llms.txt" variant="subtle">/llms.txt</GhostLink>
            <GhostLink href="/llms-full.txt" variant="subtle">
              /llms-full.txt
            </GhostLink>
            <GhostLink
              href="https://github.com/zprue743/ghostvue"
              variant="subtle"
            >
              GitHub
            </GhostLink>
          </p>
        </div>
      </section>
    </main>

    <!--
      After `<main>` on purpose: source order is what lets this decorative
      layer paint over the section backgrounds (see its stylesheet).
    -->
    <LandingSectionNumber :active-id="activeId" :motion-mode="motionMode" />
  </div>
</template>

<style src="./landing-page.css"></style>

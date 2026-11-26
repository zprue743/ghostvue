<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'

import { switchDocsTheme } from './docs-theme-transition'
import {
  DOCS_DEFAULT_THEME,
  DOCS_THEME_OPTIONS,
  isDocsThemeName,
  type DocsThemeName,
} from './restore-theme'

const labels: Record<DocsThemeName, string> = {
  default: 'Default',
  calm: 'Calm',
  vibrant: 'Vibrant',
  mono: 'Mono',
}

const theme = ref<DocsThemeName>(DOCS_DEFAULT_THEME)
let observer: MutationObserver | undefined

function readTheme(): DocsThemeName {
  const value = document.documentElement.getAttribute('data-ghost-theme')
  return value && isDocsThemeName(value) ? value : DOCS_DEFAULT_THEME
}

function applyTheme(next: DocsThemeName): void {
  // Checked state follows the choice at once. The attribute itself is
  // written a frame later, inside the crossfade.
  theme.value = next
  switchDocsTheme(next)
}

/*
 * APG radio group: the group is one Tab stop (the checked radio carries
 * tabindex 0, the rest -1), and arrow keys both move focus and check the
 * next theme, wrapping at either end. Left/Right follow the inline direction
 * so a right-to-left page keeps ArrowRight pointing at the visually next
 * option; Up/Down always follow DOM order. Home/End jump to the ends.
 */
function onKeydown(event: KeyboardEvent): void {
  const group = event.currentTarget
  if (!(group instanceof HTMLElement)) return
  const rtl = getComputedStyle(group).direction === 'rtl'
  const steps: Partial<Record<string, number>> = {
    ArrowDown: 1,
    ArrowUp: -1,
    ArrowRight: rtl ? -1 : 1,
    ArrowLeft: rtl ? 1 : -1,
  }
  const count = DOCS_THEME_OPTIONS.length
  const current = DOCS_THEME_OPTIONS.indexOf(theme.value)
  let next: number
  if (event.key === 'Home') {
    next = 0
  } else if (event.key === 'End') {
    next = count - 1
  } else {
    const step = steps[event.key]
    if (step === undefined) return
    next = (current + step + count) % count
  }
  event.preventDefault()
  const name = DOCS_THEME_OPTIONS[next]
  if (!name) return
  applyTheme(name)
  // Focus after the tabindex update so the roving stop and focus agree.
  void nextTick(() => {
    group
      .querySelector<HTMLElement>(`[data-testid="docs-theme-${name}"]`)
      ?.focus()
  })
}

onMounted(() => {
  theme.value = readTheme()
  observer = new MutationObserver(() => {
    theme.value = readTheme()
  })
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-ghost-theme'],
  })
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

<template>
  <div
    class="ghost-docs-theme-switcher"
    role="radiogroup"
    aria-label="Documentation theme"
    @keydown="onKeydown"
  >
    <button
      v-for="name in DOCS_THEME_OPTIONS"
      :key="name"
      type="button"
      class="ghost-docs-theme-switcher__option"
      role="radio"
      :aria-checked="theme === name ? 'true' : 'false'"
      :tabindex="theme === name ? 0 : -1"
      :data-active="theme === name ? '' : undefined"
      :data-testid="`docs-theme-${name}`"
      @click="applyTheme(name)"
    >
      {{ labels[name] }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

import {
  DOCS_DEFAULT_THEME,
  DOCS_THEME_OPTIONS,
  DOCS_THEME_STORAGE_KEY,
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
  document.documentElement.setAttribute('data-ghost-theme', next)
  localStorage.setItem(DOCS_THEME_STORAGE_KEY, next)
  theme.value = next
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
  >
    <button
      v-for="name in DOCS_THEME_OPTIONS"
      :key="name"
      type="button"
      class="ghost-docs-theme-switcher__option"
      role="radio"
      :aria-checked="theme === name ? 'true' : 'false'"
      :data-active="theme === name ? '' : undefined"
      :data-testid="`docs-theme-${name}`"
      @click="applyTheme(name)"
    >
      {{ labels[name] }}
    </button>
  </div>
</template>

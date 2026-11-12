import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'

import '@ghostvue/themes/default.css'
import '@ghostvue/themes/calm.css'
import '@ghostvue/themes/vibrant.css'
import '@ghostvue/themes/mono.css'
import './docs-theme.css'
import Layout from './Layout.vue'

function syncModeFromAppearance(): void {
  const root = document.documentElement
  root.classList.add('ghost-theme')
  root.setAttribute(
    'data-ghost-mode',
    root.classList.contains('dark') ? 'dark' : 'light',
  )
}

const theme: Theme = {
  extends: DefaultTheme,
  Layout,
  enhanceApp() {
    if (typeof window === 'undefined') return
    syncModeFromAppearance()
    new MutationObserver(syncModeFromAppearance).observe(
      document.documentElement,
      { attributes: true, attributeFilter: ['class'] },
    )
  },
}

export default theme

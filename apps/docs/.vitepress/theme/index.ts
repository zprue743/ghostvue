import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'

import '@slop-ui/themes/default.css'
import '@slop-ui/themes/calm.css'
import '@slop-ui/themes/vibrant.css'
import '@slop-ui/themes/mono.css'
import './docs-theme.css'
import Layout from './Layout.vue'

function syncModeFromAppearance(): void {
  const root = document.documentElement
  root.classList.add('slop-theme')
  root.setAttribute(
    'data-sl-mode',
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

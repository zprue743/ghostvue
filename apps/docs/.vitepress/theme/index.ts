import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'

import '@ghostvue/themes/default.css'
import '@ghostvue/themes/calm.css'
import '@ghostvue/themes/vibrant.css'
import '@ghostvue/themes/mono.css'
import './docs-theme.css'
import './docs-recipe-bridge.css'
import './landing-page-global.css'
import ComponentCatalog from './ComponentCatalog.vue'
import GhostExample from './GhostExample.vue'
import GhostLanding from './GhostLanding.vue'
import Layout from './Layout.vue'
import MotionReplayDemo from './MotionReplayDemo.vue'
import { reloadOnStaleChunk } from './reload-on-stale-chunk'

function syncModeFromAppearance(): void {
  const root = document.documentElement
  const mode = root.classList.contains('dark') ? 'dark' : 'light'
  if (root.getAttribute('data-ghost-mode') !== mode) {
    root.setAttribute('data-ghost-mode', mode)
  }
}

const theme: Theme = {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('ComponentCatalog', ComponentCatalog)
    app.component('GhostExample', GhostExample)
    app.component('GhostLanding', GhostLanding)
    app.component('MotionReplayDemo', MotionReplayDemo)
    if (typeof window === 'undefined') return
    reloadOnStaleChunk()
    syncModeFromAppearance()
    new MutationObserver(syncModeFromAppearance).observe(
      document.documentElement,
      { attributes: true, attributeFilter: ['class'] },
    )
  },
}

export default theme

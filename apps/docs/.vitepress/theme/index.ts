import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'

import '@ghostvue/themes/default.css'
import '@ghostvue/themes/calm.css'
import '@ghostvue/themes/vibrant.css'
import '@ghostvue/themes/mono.css'
import './docs-theme.css'
import GhostExample from './GhostExample.vue'
import Layout from './Layout.vue'
import MotionReplayDemo from './MotionReplayDemo.vue'
import { reloadOnStaleChunk } from './reload-on-stale-chunk'

function syncModeFromAppearance(): void {
  const root = document.documentElement
  // Only write when something changed. `classList.add` re-sets the `class`
  // attribute even when the token is already present, which queues another
  // mutation record and re-runs this observer forever.
  if (!root.classList.contains('ghost-theme')) root.classList.add('ghost-theme')
  const mode = root.classList.contains('dark') ? 'dark' : 'light'
  if (root.getAttribute('data-ghost-mode') !== mode) {
    root.setAttribute('data-ghost-mode', mode)
  }
}

const theme: Theme = {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('GhostExample', GhostExample)
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

import { createApp } from 'vue'

// First so its layer statement ranks the host below `ghostvue-theme`.
import './examples-host.css'
import './consumer-overrides.css'
import '@ghostvue/themes/default.css'
import '@ghostvue/themes/calm.css'
import '@ghostvue/themes/vibrant.css'
import '@ghostvue/themes/mono.css'

import ExamplesApp from './ExamplesApp.vue'
import { applyExamplesHost, resolveExamplesHost } from './examples-host'

applyExamplesHost(
  document.documentElement,
  resolveExamplesHost(window.location.search),
)

createApp(ExamplesApp).mount('#app')

// The documented quick start (docs/getting-started.md): import one flagship
// stylesheet and nothing else. The base stylesheet must arrive through the
// `@ghostvue/themes` entry's own side-effect import; never add an explicit
// `@ghostvue/themes/default.css` import here, or the smoke test stops
// proving that a production build keeps it.
import '@ghostvue/themes/calm.css'

import { createApp } from 'vue'

import App from './App.vue'

createApp(App).mount('#app')

// The documented explicit stylesheet import. The `@ghostvue/themes` entry
// also imports `default.css`, but bundlers drop that side-effect import when
// they tree-shake the entry, so a production build must not rely on it.
import '@ghostvue/themes/default.css'

import { createApp } from 'vue'

import App from './App.vue'

createApp(App).mount('#app')

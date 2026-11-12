import { createApp } from 'vue'

import './consumer-overrides.css'
import '@ghostvue/themes/default.css'
import '@ghostvue/themes/calm.css'
import '@ghostvue/themes/vibrant.css'
import '@ghostvue/themes/mono.css'

import ExamplesApp from './ExamplesApp.vue'

createApp(ExamplesApp).mount('#app')

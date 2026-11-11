import { createApp } from 'vue'

import './consumer-overrides.css'
import '@slop-ui/themes/default.css'
import '@slop-ui/themes/calm.css'
import '@slop-ui/themes/vibrant.css'
import '@slop-ui/themes/mono.css'

import App from './App.vue'

createApp(App).mount('#app')

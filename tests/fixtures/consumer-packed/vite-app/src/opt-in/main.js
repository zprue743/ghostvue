// The documented opt-in setup (docs/themes/default.md#opt-in-theme-css): one
// flagship palette, the shared base, and only the recipes this app renders.
// Components come from `@ghostvue/themes/components`, which never imports
// the all-in `default.css`, so the smoke test can prove that unrelated
// recipes and the default palette stay out of the production CSS.
import '@ghostvue/themes/calm.css'
import '@ghostvue/themes/base.css'
import '@ghostvue/themes/recipes/button.css'
import '@ghostvue/themes/recipes/dialog.css'
import '@ghostvue/themes/recipes/field.css'
import '@ghostvue/themes/recipes/input.css'

import { createApp } from 'vue'

import OptInApp from './OptInApp.vue'

createApp(OptInApp).mount('#app')

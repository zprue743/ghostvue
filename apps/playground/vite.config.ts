import { fileURLToPath } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    // Browser tests build the playground without `pnpm build`, so resolve the
    // Vue package to source instead of a possibly missing dist bundle. Keep
    // tsconfig.app.json `paths` in sync with this alias.
    alias: {
      '@slop-ui/vue': fileURLToPath(
        new URL('../../packages/vue/src/index.ts', import.meta.url),
      ),
    },
  },
})

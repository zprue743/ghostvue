import { fileURLToPath } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        examples: fileURLToPath(new URL('./examples.html', import.meta.url)),
      },
    },
  },
  resolve: {
    // Browser tests build the playground without `pnpm build`, so resolve the
    // Vue package to source instead of a possibly missing dist bundle. Keep
    // tsconfig.app.json `paths` in sync with this alias.
    alias: {
      '@ghostvue/themes/default.css': fileURLToPath(
        new URL('../../packages/themes/src/default.css', import.meta.url),
      ),
      '@ghostvue/themes/calm.css': fileURLToPath(
        new URL(
          '../../packages/themes/src/generated/calm.css',
          import.meta.url,
        ),
      ),
      '@ghostvue/themes/vibrant.css': fileURLToPath(
        new URL(
          '../../packages/themes/src/generated/vibrant.css',
          import.meta.url,
        ),
      ),
      '@ghostvue/themes/mono.css': fileURLToPath(
        new URL(
          '../../packages/themes/src/generated/mono.css',
          import.meta.url,
        ),
      ),
      '@ghostvue/themes': fileURLToPath(
        new URL('../../packages/themes/src/index.ts', import.meta.url),
      ),
      '@ghostvue/vue': fileURLToPath(
        new URL('../../packages/vue/src/index.ts', import.meta.url),
      ),
    },
  },
})

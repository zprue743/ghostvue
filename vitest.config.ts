import { fileURLToPath } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // SFC tests need the same Vue compiler the package build uses.
  plugins: [vue()],
  resolve: {
    // Package exports point at dist, which `pnpm test` does not build.
    alias: {
      '@ghostvue/vue': fileURLToPath(
        new URL('./packages/vue/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['packages/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
})

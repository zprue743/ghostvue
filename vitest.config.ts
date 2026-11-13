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
      provider: 'v8',
      reporter: ['text', 'html'],
      // Measure publishable package sources (including Node-side theme compilers
      // in packages/themes/scripts/lib); CLI entry scripts (.mjs), generated
      // token outputs, build artifacts, and type-test fixtures are not unit targets.
      include: ['packages/**/*.{ts,js,vue}'],
      exclude: [
        '**/dist/**',
        '**/generated/**',
        '**/fixtures/**',
        '**/type-tests/**',
        '**/vite.config.*',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
      thresholds: {
        lines: 80,
      },
    },
  },
})

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  build: {
    // Vite empties dist first, so vue-tsc must run after this build.
    emptyOutDir: true,
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'ghostvue',
    },
    rollupOptions: {
      // Vue remains a peer dependency and @floating-ui/dom a runtime dependency
      // so consumer bundlers share a single copy and tree-shake unused middleware.
      external: ['vue', '@floating-ui/dom'],
    },
  },
})

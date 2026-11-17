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
      // Vue remains a peer dependency and runtime dependencies (@floating-ui/dom,
      // @internationalized/date) stay external so consumer bundlers share a single
      // copy, preserve class identity, and tree-shake unused code.
      external: ['vue', '@floating-ui/dom', '@internationalized/date'],
    },
  },
})

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
      fileName: 'slop-ui',
    },
    rollupOptions: {
      // Vue remains a peer dependency so consumers share their application
      // runtime instead of receiving a second copy in the library bundle.
      external: ['vue'],
    },
  },
})

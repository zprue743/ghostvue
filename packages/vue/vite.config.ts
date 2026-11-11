import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  build: {
    // Vite empties `dist` before writing the JS bundle. Keep this true so stale
    // artifacts cannot ship, and emit declarations in the package build script
    // after `vite build` so vue-tsc output is not deleted.
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

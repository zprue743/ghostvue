import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// `GHOSTVUE_SMOKE_VARIANT=opt-in` builds the opt-in theme CSS page into its own
// output directory, so the smoke test can compare its CSS with the all-in
// page built from the same fixture without shared chunks blurring the sizes.
const optIn = process.env.GHOSTVUE_SMOKE_VARIANT === 'opt-in'

export default defineConfig({
  plugins: [vue()],
  build: optIn
    ? { outDir: 'dist-opt-in', rollupOptions: { input: 'opt-in.html' } }
    : {},
})

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const root = path.dirname(fileURLToPath(import.meta.url))
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [{ find: '@prototype', replacement: path.join(root, 'src') }],
  },
  server: { port: 5199 },
})
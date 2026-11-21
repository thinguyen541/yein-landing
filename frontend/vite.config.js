import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// In dev (npm run dev), API calls and product images (/resources) are proxied to the Node backend on :4000
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/resources': 'http://localhost:4000',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})

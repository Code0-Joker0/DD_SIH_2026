import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': {
        target: 'http://100.102.220.16:9000',
        changeOrigin: true
      },
      '/chat': {
        target: 'http://100.102.220.16:9000',
        changeOrigin: true
      },
      '/health': {
        target: 'http://100.102.220.16:9000',
        changeOrigin: true
      },
      '/knowledge': {
        target: 'http://100.102.220.16:9000',
        changeOrigin: true
      }
    }
  }
})

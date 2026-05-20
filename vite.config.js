import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { dataFactoryMockPlugin } from './mock/mockServer.js'

export default defineConfig({
  plugins: [vue(), ...(process.env.VITE_API_MODE === 'mock' ? [dataFactoryMockPlugin()] : [])],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://www.tagtax.cc',
        changeOrigin: true
      },
      '/auth': {
        target: 'https://www.tagtax.cc',
        changeOrigin: true
      }
    }
  }
})

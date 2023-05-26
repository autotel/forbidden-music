import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: true,
    
    port: 3000,
    https: {
      key: './certificates/private.key',
      cert: './certificates/cert.crt',
    },
  },
  plugins: [
    vue(),
  ],
  base: '',
})

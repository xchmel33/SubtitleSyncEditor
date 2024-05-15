import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import VueDevTools from 'vite-plugin-vue-devtools'

const path = require('path')

const isWindows = process.platform === 'win32'
let base
if (isWindows) {
  base = `file:///${path.resolve(__dirname, './dist/').replace(/\\/g, '/')}/`
} else {
  base = path.join(__dirname, './dist/')
}

export default defineConfig(({ command }) => ({
  base: command === 'build' ? base : './',
  // plugins: [vue(), VueDevTools()],
  plugins: [vue()],
  server: {
    cors: true, // Enable CORS
    headers: {
      'Access-Control-Allow-Origin': '*', // Allow all origins
      'Access-Control-Allow-Methods': 'GET,POST', // Allow specific methods
      'Access-Control-Allow-Headers': 'Content-Type', // Allow specific headers
    },
  },
  resolve: {
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
    alias: {
      // vue: '@vue/compat',
      '@': path.resolve(__dirname, './src'),
    },
  },
}))

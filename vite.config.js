import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

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
  plugins: [vue()],
  resolve: {
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
    alias: {
      // vue: '@vue/compat',
      '@': path.resolve(__dirname, './src'),
    },
  },
}))

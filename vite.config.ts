import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    // The lazy 3D chunk (three and @react-three/fiber) is a little over 900 kB minified and does
    // not tree-shake further. Raise the limit so the warning keeps its meaning for other chunks.
    chunkSizeWarningLimit: 1000,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Vitest hands a test an empty string for a stylesheet unless told otherwise. One test reads the periodic
    // table's stylesheet, where its dimming and motion rules are.
    css: { include: [/periodic\.css/] },
  },
})

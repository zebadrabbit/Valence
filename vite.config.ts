import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { firstPaintScript } from './src/app/firstPaint.ts'

const FIRST_PAINT_MARK = '<!--first-paint-->'

// The stored or system theme, applied before first paint so that the dark theme never flashes light. The
// script is made from the app's own definition of the preference, so the two cannot drift. It goes where
// index.html marks, ahead of the stylesheet; an index.html without the mark fails the build. Exported for
// firstPaint.test.ts, which holds it to that.
export const firstPaint = {
  name: 'first-paint',
  transformIndexHtml(html: string) {
    if (!html.includes(FIRST_PAINT_MARK)) throw new Error(`index.html has no ${FIRST_PAINT_MARK} for the first-paint script`)
    return html.replace(FIRST_PAINT_MARK, () => `<script>${firstPaintScript()}</script>`)
  },
}

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), firstPaint],
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
    // table's stylesheet, where its dimming and motion rules are, one the app's, for its colour schemes, and one
    // the lab shell's, for which form of a guide it displays. Three read a lab's own, for how long its one animation runs.
    css: { include: [/periodic\.css/, /src\/index\.css/, /lab\/lab\.css/, /aqueous\.css/, /flame\.css/, /calorimetry\.css/] },
  },
})

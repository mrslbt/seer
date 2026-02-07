import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

/**
 * Vite plugin that copies the swisseph-wasm .data file into the build output.
 *
 * The Emscripten-generated loader fetches swisseph.data at runtime.
 * After bundling, the library's locateFile resolves it to /wsam/swisseph.data
 * (relative to the assets directory). This plugin ensures the file exists
 * at that path in the final dist output.
 */
function copySwissEphData() {
  return {
    name: 'copy-swisseph-data',
    writeBundle() {
      const src = path.resolve(__dirname, 'node_modules/swisseph-wasm/wsam/swisseph.data')
      const destDir = path.resolve(__dirname, 'dist/wsam')
      const dest = path.resolve(destDir, 'swisseph.data')

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true })
      }

      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest)
        const sizeMB = (fs.statSync(dest).size / 1024 / 1024).toFixed(1)
        console.log(`\n  ✓ Copied swisseph.data (${sizeMB} MB) → dist/wsam/`)
      } else {
        console.warn('\n  ⚠ swisseph.data not found in node_modules — ephemeris will not load')
      }
    }
  }
}

export default defineConfig({
  plugins: [react(), copySwissEphData()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    fs: {
      allow: ['..']
    }
  },
  assetsInclude: ['**/*.wasm'],
  optimizeDeps: {
    exclude: ['swisseph-wasm']
  }
})

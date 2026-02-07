import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

/**
 * Vite plugin that copies swisseph-wasm runtime files into the build output.
 *
 * The library's locateFile resolves BOTH .data and .wasm to /wsam/ (relative
 * to the /assets/ directory). Vite bundles the .wasm into /assets/ with a
 * content hash, but locateFile overrides that path to /wsam/swisseph.wasm.
 * So we must copy both files to dist/wsam/ for the loader to find them.
 */
function copySwissEphFiles() {
  return {
    name: 'copy-swisseph-files',
    writeBundle() {
      const wsamDir = path.resolve(__dirname, 'node_modules/swisseph-wasm/wsam')
      const destDir = path.resolve(__dirname, 'dist/wsam')

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true })
      }

      const files = ['swisseph.data', 'swisseph.wasm']
      for (const file of files) {
        const src = path.resolve(wsamDir, file)
        const dest = path.resolve(destDir, file)
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest)
          const sizeMB = (fs.statSync(dest).size / 1024 / 1024).toFixed(1)
          console.log(`  ✓ Copied ${file} (${sizeMB} MB) → dist/wsam/`)
        } else {
          console.warn(`  ⚠ ${file} not found in node_modules`)
        }
      }
    }
  }
}

export default defineConfig({
  plugins: [react(), copySwissEphFiles()],
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

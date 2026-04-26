import { createRequire } from 'node:module'
import path from 'path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// Load @vitejs/plugin-react via CJS. Node 22 + Vite's bundled TS config can fail on
// `import react from '@vitejs/plugin-react'` ("does not provide an export named 'default'").
const require = createRequire(import.meta.url)
const react = require('@vitejs/plugin-react') as () => import('vite').Plugin[]

export default defineConfig(async () => {
  let tailwindcss: null | (() => import('vite').Plugin[]) = null
  try {
    // Prefer ESM import. Some installs can end up with a broken/missing `dist/` folder
    // under `node_modules/@tailwindcss/vite`, which would otherwise crash dev server startup.
    const mod = (await import('@tailwindcss/vite')) as unknown as
      | (() => import('vite').Plugin[])
      | { default: () => import('vite').Plugin[] }
    tailwindcss = typeof mod === 'function' ? mod : mod.default
  } catch (e) {
    // Keep dev server running even if the Tailwind Vite plugin can't be resolved.
    // Tailwind styles can still work via CSS import + PostCSS if configured elsewhere.
    console.warn('[vite] Tailwind Vite plugin unavailable; continuing without it.', e)
  }

  return {
  // Avoid caching optimized deps inside `node_modules/.vite` (which can get wiped or partially written).
  // Keeping the cache in the project root makes it stable across installs and fixes "chunk-*.js missing".
  cacheDir: '.vite-cache',
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    ...(tailwindcss ? [tailwindcss()] : []),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
  }
})

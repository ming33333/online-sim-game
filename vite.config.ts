import { createRequire } from 'node:module'
import path from 'path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// Load @vitejs/plugin-react via CJS. Node 22 + Vite's bundled TS config can fail on
// `import react from '@vitejs/plugin-react'` ("does not provide an export named 'default'").
const require = createRequire(import.meta.url)
const react = require('@vitejs/plugin-react') as () => import('vite').Plugin[]

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})

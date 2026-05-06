import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string }

const config = defineConfig({
  base: '/ui/',
  plugins: [
    tailwindcss(),
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    viteReact(),
  ],
  define: {
    'import.meta.env.VITE_UI_VERSION': JSON.stringify(pkg.version),
  },
})

export default config

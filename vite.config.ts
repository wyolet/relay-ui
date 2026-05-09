import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string }

const CONTROL_TARGET =
  process.env.RELAY_CONTROL_TARGET ?? 'https://relay-control-api.wyolet.dev'

const proxy = {
  target: CONTROL_TARGET,
  changeOrigin: true,
  secure: false,
  cookieDomainRewrite: { '*': '' },
}

const config = defineConfig({
  plugins: [
    tailwindcss(),
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    viteReact(),
  ],
  define: {
    'import.meta.env.VITE_UI_VERSION': JSON.stringify(pkg.version),
  },
  server: {
    host: true,
    port: 5140,
    strictPort: true,
    allowedHosts: ['relay.wyolet.dev', '.wyolet.dev', 'localhost'],
    hmr: { host: 'relay.wyolet.dev', clientPort: 443, protocol: 'wss' },
    proxy: {
      '/control': proxy,
      '/healthz': proxy,
      '/openapi.json': proxy,
    },
  },
})

export default config

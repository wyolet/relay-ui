import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version?: string }

// In CI the Release workflow sets RELAY_UI_VERSION to the git tag (e.g. v1.2.3).
// Locally we fall back to package.json's version, then to "dev".
const UI_VERSION = process.env.RELAY_UI_VERSION ?? pkg.version ?? 'dev'

// Where the dev server proxies API calls (/control, /openapi.json, …).
// Point this at a running Relay control plane — the standalone image serves
// it on http://localhost:8080. Override with RELAY_CONTROL_TARGET.
const CONTROL_TARGET =
  process.env.RELAY_CONTROL_TARGET ?? 'http://localhost:8080'

// Optional: serve the dev server behind an HTTPS tunnel (e.g. to test the UI
// on a phone). Set RELAY_DEV_HOST to the public hostname; HMR then runs over
// wss on 443. Unset, the dev server is plain localhost.
const DEV_HOST = process.env.RELAY_DEV_HOST

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
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    'import.meta.env.VITE_UI_VERSION': JSON.stringify(UI_VERSION),
  },
  server: {
    host: true,
    port: 5140,
    strictPort: true,
    allowedHosts: DEV_HOST ? [DEV_HOST, 'localhost'] : ['localhost'],
    ...(DEV_HOST
      ? { hmr: { host: DEV_HOST, clientPort: 443, protocol: 'wss' } }
      : {}),
    proxy: {
      '/control': proxy,
      '/healthz': proxy,
      '/openapi.json': proxy,
    },
  },
})

export default config

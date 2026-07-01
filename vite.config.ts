import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version?: string }

// In CI the Release workflow sets RELAY_UI_VERSION to the git tag (e.g. v1.2.3).
// Locally we fall back to package.json's version, then to "dev".
const UI_VERSION = process.env.RELAY_UI_VERSION ?? pkg.version ?? 'dev'

// RELAY_* settings may live in the gitignored .env/.env.development too;
// shell env wins over file values. (These only shape the dev server.)
const fileEnv = loadEnv('development', process.cwd(), 'RELAY_')

// Where the dev server proxies API calls to. The relay mounts its control API
// under /api (so CRUD paths like /models don't shadow SPA routes) and serves
// the runtime-config document at /config.json; the control plane listens on
// :8081 by default (:8080 is the data plane). Override with RELAY_CONTROL_TARGET.
const CONTROL_TARGET =
  process.env.RELAY_CONTROL_TARGET ??
  fileEnv.RELAY_CONTROL_TARGET ??
  'http://localhost:8081'

// Optional: serve the dev server behind an HTTPS reverse proxy or tunnel
// (e.g. to test the UI on a phone). Set RELAY_DEV_HOST to the public
// hostname; HMR then runs over wss on 443. Unset, plain localhost.
const DEV_HOST = process.env.RELAY_DEV_HOST ?? fileEnv.RELAY_DEV_HOST

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
      '/api': proxy,
      '/config.json': proxy,
    },
  },
})

export default config

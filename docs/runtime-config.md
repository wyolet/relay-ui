# Runtime config endpoint (backend ask)

## Why

relay-ui is built **once** and shipped as a generic tarball, then embedded into
the relay binary (`//go:embed`). That means **build-time env vars (`VITE_*`)
cannot encode a specific deployment's values** — by the time a deployment runs,
the bundle is frozen. The only build-time value we keep is the UI's own release
version (baked at tarball build).

Anything that varies per deployment (URLs, mode, flags) must be delivered at
**runtime**. A static browser bundle has exactly three ways to learn such
values: (1) the server injects them into the served HTML, (2) it loads a config
resource at boot, or (3) build-time bake (not available to us). We're choosing
**(2): a small public config document fetched at boot**, same-origin — the
OIDC `/.well-known/openid-configuration` pattern.

## What we need

A single **unauthenticated**, **same-origin** endpoint the UI fetches once at
startup, returning the public runtime configuration as JSON.

- **Method / path:** `GET /config.json` (served from the **UI's own origin** —
  see "Same-origin requirement" below).
- **Auth:** none. The UI fetches this *before* it can authenticate, so it must
  be open. Only public values go here.
- **Content-Type:** `application/json`.

### Same-origin requirement (important)

The config must be served from **wherever the UI bundle is served from**, not
from the control API. In a split deployment (UI on `:8081`, API on `:8080`), the
UI fetches `${window.location.origin}/config.json` — i.e. from `:8081`. If the
config lived on the API, we'd have a bootstrap paradox: we'd need to know the API
URL to fetch the document that *tells us* the API URL. Serving it from the UI's
own origin (the host that already serves `index.html`) avoids that entirely.

So: the same handler/host that serves the embedded UI also serves
`/config.json`.

### Cache-Control

The UI reads this on every page load, so make it cacheable to keep that read off
the network most of the time:

```
Cache-Control: public, max-age=60, stale-while-revalidate=600
```

- `max-age=60` — short enough that a deploy's new values are picked up within a
  minute; long enough that refreshes within a session hit the browser cache.
- `stale-while-revalidate` — refreshes serve instantly from cache while the new
  copy is fetched in the background.
- Tune the numbers to taste; the only hard requirement is that it's **not**
  `no-store` (don't force a blocking network read on every refresh).
- The body is small (<1 KB), so this is cheap regardless.

## Response shape

```jsonc
{
  // --- Endpoints (required) ---------------------------------------------
  // Base origin of the control/admin API (no trailing slash). The UI's
  // openapi-fetch client points here. May equal the UI origin (embedded
  // single-binary) or differ (split deploy).
  "controlApiUrl": "https://relay.example.com",

  // Base origin of the data plane (OpenAI-compatible inference). The UI builds
  // copy-paste client snippets as `${inferenceApiUrl}/{adapter}/v1`
  // (e.g. .../openai/v1). May equal controlApiUrl or differ.
  "inferenceApiUrl": "https://relay.example.com",

  // --- Deployment identity (recommended) --------------------------------
  // Distinguishes OSS self-host from managed cloud. Lets the UI toggle
  // cloud-only vs OSS-only surfaces without a rebuild.
  "mode": "oss",                       // "oss" | "cloud"

  // Backend build version (distinct from the UI's own release version).
  // Optional — we already have GET /version; include here only if convenient.
  "version": "1.4.2",

  // --- Feature flags (optional, extensible) -----------------------------
  // Free-form on/off switches so we can dark-launch UI features per deploy.
  // Unknown keys are ignored by the UI; absence = default (usually off).
  "features": {
    "usageAnalytics": true,
    "auditLog": false
  },

  // --- Observability (optional) -----------------------------------------
  // PUBLIC client-side telemetry only (e.g. a Sentry DSN / analytics site id).
  // These are public by design — never put server secrets here.
  "telemetry": {
    "sentryDsn": "https://abc@o0.ingest.sentry.io/0",
    "environment": "production"
  },

  // --- Branding / links (optional) --------------------------------------
  "docsUrl": "https://docs.example.com",
  "supportUrl": "https://example.com/support"
}
```

### Field rules

- **`controlApiUrl` / `inferenceApiUrl`** are the two we need first. Everything
  else is additive — the UI reads keys it knows and ignores the rest, so the
  object can grow without UI coordination.
- Omit a key to fall back to the UI's default (origin for URLs, off for flags).
  An empty/missing `controlApiUrl` ⇒ UI uses `window.location.origin`.
- URLs: **no trailing slash**, include scheme + host (+ port). The UI appends
  paths.

## Security (what may and may NOT go here)

This document is world-readable. Only **public** values belong here — the same
values that already reach the browser anyway:

- ✅ URLs, `mode`, feature flags, public client IDs, a Sentry DSN, doc/support
  links, backend version.
- ❌ **Never**: privileged API keys, DB credentials, server-side tokens, signing
  keys, internal-only hostnames you don't want disclosed. Treat it like the OIDC
  discovery doc — public by definition.

## UI side (for reference — we'll handle this)

The UI will, at app boot (root loader, before first render):

1. `fetch(\`${window.location.origin}/config.json\`)`, parse into a typed
   `RelayRuntimeConfig`.
2. Seed a small config store; everything (`CONTROL_API_URL`,
   `INFERENCE_API_URL`, flags, …) reads from it.
3. Resolution precedence per value:
   **`config.json` (runtime) → `import.meta.env.VITE_*` (dev only) → sane
   default (`window.location.origin` for URLs).**

So dev keeps using `VITE_*`; embedded/prod uses `/config.json`. If the fetch
fails (e.g. file not deployed), the UI degrades to origin defaults rather than
hard-failing.

## TL;DR for backend

- Add `GET /config.json` on the **UI-serving origin**, unauthenticated,
  `application/json`.
- Body: at minimum `{ "controlApiUrl", "inferenceApiUrl" }`; the rest is
  optional/extensible per the shape above.
- Header: `Cache-Control: public, max-age=60, stale-while-revalidate=600`
  (anything but `no-store`).
- Public values only — no secrets.

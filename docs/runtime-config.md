# Runtime config (`/config.json`)

relay-ui is built once and shipped as a generic tarball, then embedded into the
relay binary (`//go:embed`). Build-time env (`VITE_*`) can't encode a specific
deployment's values, so anything that varies per deployment is delivered at
runtime via a small public config document fetched once at boot — the
`/.well-known/openid-configuration` pattern.

## Contract

- **`GET /config.json`** on the **UI-serving origin** (same-origin — fetched
  before auth, so no CORS, no credentials).
- **Auth:** none. **Content-Type:** `application/json`. Body < 1 KB.
- **Cache-Control:** `public, max-age=60, stale-while-revalidate=600` — short
  enough that a deploy's new values land within a minute; never `no-store`.

## Response shape

```jsonc
{
  // Base of the control/admin API, INCLUDING any path prefix the routes
  // actually live under (e.g. "https://relay.example.com/api" when the
  // control router mounts at /api). No trailing slash. May equal the UI
  // origin (embedded single-binary) or differ (split deploy).
  "controlApiUrl": "https://relay.example.com/api",

  // Base of the data plane; the UI builds client snippets as
  // `${inferenceApiUrl}/{adapter}/v1`.
  "inferenceApiUrl": "https://relay.example.com",

  "mode": "oss",                    // "oss" | "cloud" — gates deploy-specific surfaces
  "version": "1.4.2",               // backend build version (optional)
  "features": { "oidc": true },     // free-form flags; unknown keys ignored, absent = off
  "telemetry": { "sentryDsn": "…" } // PUBLIC client-side values only
}
```

- Omit a key → the UI falls back to its default (own origin for URLs, off for
  flags).
- **Public values only.** Never privileged API keys, DB credentials,
  server-side tokens, or signing material — the document is unauthenticated by
  design.

## UI side

`src/api/runtimeConfig.ts` fetches the document at boot (`main.tsx` `boot()`),
exposes `controlApiUrl()` / `feature()`, and honors a dev-only
`VITE_CONTROL_API_URL` override with precedence over the document — the escape
hatch for backends whose document advertises a stale base (e.g. routes moved
under `/api` while the doc still says the bare origin).

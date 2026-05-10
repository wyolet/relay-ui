# relay-ui

Operator admin UI for [Wyolet Relay](https://github.com/wyolet/relay) — a high-throughput LLM router.

This repo produces a static SPA (`dist/`) that is embedded into the Relay Go binary via `//go:embed` and served at `/ui/`.

## Tech stack

- React 19 + TypeScript 5
- Vite 8
- TanStack Router (file-based, type-safe) + TanStack Query v5 + TanStack Form
- Tailwind CSS v4 + shadcn (luma) on `@base-ui/react`
- openapi-typescript + openapi-fetch (typed API client from `/openapi.json`)
- Biome (lint + format — replaces eslint/prettier)
- bun

## Local development

```bash
bun install
bun run dev          # Vite dev server on http://localhost:5140
```

Point the dev server at a running Relay instance for live API calls:

```bash
RELAY_URL=http://localhost:8080 make gen   # regenerate types
bun run dev
```

## Building

```bash
bun run build        # outputs to dist/
```

## Type generation

API types are generated from the Relay OpenAPI spec via the Makefile:

```bash
make gen                                  # fetches from https://relay.wyolet.dev/openapi.json
RELAY_URL=http://localhost:8080 make gen  # custom URL (uses curl -sk to avoid TLS issues)
```

Generated file: `src/api/types.gen.ts` — commit after regenerating. Do not edit by hand.

## CI

```bash
bun run ci           # typecheck + lint (runs in GitHub Actions on every push/PR)
```

## Releasing

1. Tag the commit: `git tag v1.2.3 && git push origin v1.2.3`
2. GitHub Actions builds the project and uploads `relay-ui-v1.2.3.tar.gz` as a GitHub Release asset.
3. The main `wyolet/relay` repo pins this tarball in its build.

## Directory layout

```
src/
  api/
    types.gen.ts      # generated — do not edit by hand
    client.ts         # openapi-fetch typed client
    hooks/            # per-domain TanStack Query hooks (queryOptions + mutations)
    types/            # domain type aliases over the OpenAPI schema
  components/
    ui/               # shadcn (luma) primitives — vendored, biome-ignored
    *.tsx             # feature components + useXForm() hooks
  routes/             # file-based TanStack Router; routeTree.gen.ts is generated
  stores/             # zustand stores
  styles/             # globals.css (semantic-token bridges) — biome-ignored
  styles.css
  main.tsx
.github/workflows/
  ci.yml              # lint + typecheck on every push
  release.yml         # build + tarball → GitHub Release on tag push
  drift.yml           # nightly API drift check vs live Relay container
```

See `CLAUDE.md` for the layering rules (state management, form pattern, styling conventions).

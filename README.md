# relay-ui

Operator admin UI for [Wyolet Relay](https://github.com/wyolet/relay) — a high-throughput LLM router.

Linear project: [Wyolet Relay](https://linear.app/aliboyev/project/wyolet-relay-66b6cdcde707) (team `PER`). All issues for this UI are tracked there.

This repo produces a static SPA (`dist/`) that is embedded into the Relay Go binary via `//go:embed` (see [PER-273](https://linear.app/aliboyev/issue/PER-273)). It is served at the root path.

## Tech stack

- React 19 + TypeScript 5
- Vite 8
- TanStack Router (file-based, type-safe) + TanStack Query v5
- Tailwind CSS v4
- openapi-typescript + openapi-fetch (typed API client from `/openapi.json`)
- Biome (lint + format — replaces eslint/prettier)
- bun

## Local development

```bash
bun install
bun run dev          # Vite dev server on http://localhost:5140
```

Point the dev server proxy at a running Relay instance for live API calls:

```bash
OPENAPI_URL=http://localhost:8080/openapi.json bun run gen:api   # regenerate types
bun run dev
```

## Building

```bash
bun run build        # outputs to dist/
```

## Type generation

API types are generated from the Relay OpenAPI spec via the Makefile:

```bash
make gen                          # fetches from https://relay.wyolet.dev/openapi.json
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
3. The main `wyolet/relay` repo pins this tarball in its build (PER-273).

## Directory layout

```
src/
  api/
    types.gen.ts      # generated — do not edit by hand
    client.ts         # openapi-fetch typed client instance
    hooks/            # per-kind React Query hooks (added in PER-274+)
  components/         # shadcn-ui primitive copies
  routes/
    __root.tsx        # root layout (QueryClientProvider)
    index.tsx         # / → hello-world
  main.tsx
  styles.css
.github/workflows/
  ci.yml             # lint + typecheck + bundle-size check on every push
  release.yml        # build + tarball → GitHub Release on tag push
  drift.yml          # nightly API drift check vs live Relay container
```

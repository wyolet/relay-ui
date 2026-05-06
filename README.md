# relay-ui

Operator admin UI for [Wyolet Relay](https://github.com/wyolet/relay) — a high-throughput LLM router.

This repo produces a static SPA (`dist/`) that is embedded into the Relay Go binary via `//go:embed` (see [PER-273](https://linear.app/aliboyev/issue/PER-273)). It is served at the `/ui/` path prefix.

## Tech stack

- React 19 + TypeScript 5
- Vite 8 (`base: '/ui/'`)
- TanStack Router (file-based, type-safe) + TanStack Query v5
- Tailwind CSS v4
- openapi-typescript + openapi-fetch (typed API client from `/openapi.json`)
- Biome (lint + format — replaces eslint/prettier)
- pnpm

## Local development

```bash
pnpm install
pnpm dev          # Vite dev server on http://localhost:5173/ui/
```

Point the dev server proxy at a running Relay instance for live API calls:

```bash
OPENAPI_URL=http://localhost:8080/openapi.json pnpm gen:api   # regenerate types
pnpm dev
```

## Building

```bash
pnpm build        # outputs to dist/
```

## Type generation

API types are generated from the Relay OpenAPI spec:

```bash
pnpm gen:api                                                    # uses http://localhost:8080/openapi.json
OPENAPI_URL=https://my-relay-host/openapi.json pnpm gen:api    # custom URL
```

Generated file: `src/api/types.gen.ts` — commit after regenerating.

## CI

```bash
pnpm ci           # typecheck + lint (runs in GitHub Actions on every push/PR)
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

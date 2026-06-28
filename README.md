<div align="center">
  <img src=".github/assets/logo.png" alt="Wyolet Relay" width="104">

  <h1>relay-ui</h1>

  <p>
    <strong>The operator admin UI for Wyolet Relay.</strong><br>
    Manage providers, keys, policies, and usage from one console.
  </p>

  <p>
    <a href="https://docs.wyolet.com"><img src="https://img.shields.io/badge/docs-docs.wyolet.com-7c3aed" alt="Docs"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-7c3aed" alt="License: Apache-2.0"></a>
    <a href="https://github.com/wyolet/relay"><img src="https://img.shields.io/badge/backend-wyolet%2Frelay-24292e?logo=github&logoColor=white" alt="Backend: wyolet/relay"></a>
    <a href="https://discord.gg/KUhJ8X3w"><img src="https://img.shields.io/badge/discord-join-5865F2?logo=discord&logoColor=white" alt="Discord"></a>
    <a href="https://x.com/wyolethq"><img src="https://img.shields.io/badge/follow-%40wyolethq-000000?logo=x&logoColor=white" alt="Follow on X"></a>
  </p>

  <p>
    <a href="https://docs.wyolet.com">Docs</a> ·
    <a href="https://github.com/wyolet/relay">Relay (backend)</a> ·
    <a href="https://discord.gg/KUhJ8X3w">Discord</a> ·
    <a href="https://x.com/wyolethq">X</a> ·
    <a href="https://www.linkedin.com/company/wyolet">LinkedIn</a> ·
    <a href="https://bsky.app/profile/wyolet.bsky.social">Bluesky</a> ·
    <a href="https://www.reddit.com/r/wyolet">Reddit</a>
  </p>
</div>

---

relay-ui is the admin console for [Wyolet Relay](https://github.com/wyolet/relay) —
the high-throughput, self-hostable LLM router. It's a static SPA that gets
**embedded into the Relay Go binary** via `//go:embed` and served at `/ui/`, so
operators get a full management console without running a separate service. Add
provider keys, mint rate-limited relay keys, define access policies, and watch
per-key usage and cost — all from the browser.

You don't need to build this repo to use Relay: the official images already
ship the UI. Pull one and open the console:

```bash
docker run -p 8080:8080 -p 8081:8081 wyolet/relay:standalone
# admin UI → http://localhost:8081
```

This repository is for **developing the UI itself**.

## Tech stack

- React 19 + TypeScript 5
- Vite 8
- TanStack Router (file-based, type-safe) + TanStack Query v5 + TanStack Form
- Tailwind CSS v4 + shadcn (luma) on `@base-ui/react`
- openapi-typescript + openapi-fetch (typed API client from `/openapi.json`)
- Biome (lint + format — replaces eslint/prettier)
- [Bun](https://bun.sh)

## Local development

```bash
bun install
bun run dev          # Vite dev server on http://localhost:5140
```

The dev server proxies API calls to a Relay control plane at
`http://localhost:8080`. Point it elsewhere with `RELAY_CONTROL_TARGET`:

```bash
RELAY_CONTROL_TARGET=http://localhost:8080 bun run dev
```

## Building

```bash
bun run build        # outputs to dist/
```

## Type generation

API types are generated from the Relay OpenAPI spec via the Makefile — never
edit `src/api/types.gen.ts` by hand:

```bash
make gen                                  # default: http://localhost:8080/openapi.json
RELAY_URL=http://localhost:8080 make gen  # custom control-plane URL
```

Commit the regenerated file after running it.

## CI

```bash
bun run ci           # typecheck + lint + test (runs in GitHub Actions on every push/PR)
```

## Releasing

1. `make release VERSION=v1.2.3` — bumps `package.json`, tags, and pushes.
2. GitHub Actions builds the project and uploads `relay-ui-v1.2.3.tar.gz` as a
   GitHub Release asset.
3. The main `wyolet/relay` repo pins this tarball and embeds it at build time.

## Directory layout

```
src/
  api/
    types.gen.ts      # generated — do not edit by hand
    client.ts         # openapi-fetch typed client
    hooks/            # per-domain TanStack Query hooks (queryOptions + mutations)
    types/            # domain type aliases over the OpenAPI schema
  <domain>/           # policies/, host-keys/, relay-keys/, models/, … — components + useXForm() hooks
  components/ui/       # shadcn (luma) primitives — vendored, biome-ignored
  routes/             # file-based TanStack Router; routeTree.gen.ts is generated
  stores/             # zustand stores
  lib/                # pure utilities
  styles/             # globals.css + theme.css (semantic-token bridges) — biome-ignored
  styles.css
  main.tsx
.github/workflows/
  ci.yml              # lint + typecheck + test + build on every push
  release.yml         # build + tarball → GitHub Release on tag push
  drift.yml           # nightly API drift check vs the live Relay image
```

See [`CLAUDE.md`](CLAUDE.md) for the full layering rules (state management, form
pattern, styling conventions).

## Contributing

Issues and pull requests are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).
For security reports, see [SECURITY.md](SECURITY.md).

## License

[Apache-2.0](LICENSE). Backend issues belong on
[wyolet/relay](https://github.com/wyolet/relay).

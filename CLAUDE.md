# relay-ui

Operator admin UI for **Wyolet Relay** (high-throughput Go LLM router). Built as a static SPA, embedded into the Relay binary via `//go:embed`, served at `/ui/`.

- Upstream API: `wyolet/relay` Go service; types come from its `/openapi.json`.

React 19 + Vite + TanStack Router + TanStack Query + Tailwind v4 + Biome + shadcn (luma) on `@base-ui/react`.
Path alias: `@/*` → `src/*` (configured in `tsconfig.json` paths and `vite.config.ts` resolve.alias). Package manager: bun.

## Dev workflow

- **Dev server:** `bun run dev` on `:5140`. It proxies `/api` (the control
  API mount; `/openapi.json` lives inside it) and `/config.json` (the runtime
  config document) to a running Relay **control plane** — default
  `http://localhost:8081` (`:8080` is the data plane), override with
  `RELAY_CONTROL_TARGET`. Spin up a backend with
  `docker run -p 8080:8080 -p 8081:8081 wyolet/relay:standalone`.
- **API types:** generated from Relay's OpenAPI spec — never hand-edit
  `src/api/types.gen.ts`. `make gen` (or `RELAY_URL=… make gen`) regenerates it.
- **Ship pipeline:** relay-ui has no compose/Dockerfile of its own. It builds to
  a static `dist/`, gets packaged as a `relay-ui-vX.Y.Z.tar.gz` release asset
  (`make release VERSION=…`), and the `wyolet/relay` repo pins that tarball and
  embeds it into the Go binary via `//go:embed`, serving it at `/ui/`.

See `README.md` and `CONTRIBUTING.md` for the full build/release walkthrough.

## Frontend layering (non-negotiable)

The point: redesigning a page should be **swapping components, not rebuilding logic**. That only works if logic lives outside.

- **Components render strings.** No fetching, no mutation calls, no derived business state inside a component file. If a component imports `@tanstack/react-query` or `zustand` directly, that's a smell — the logic belongs in a hook.
- **Custom hooks own business logic.** Hooks compose TanStack Query + Zustand. Components call `useFooThing()`, never `useSuspenseQuery(fooQueryOptions)` or `useFooStore` directly.
- **TanStack Form via `useXForm()` hooks.** Each form gets its own hook (`usePolicyForm`, `useRateLimitForm`, `useCreateRelayKeyForm`, …) that owns the `useForm` instance, the zod schema, and `onSubmit` (which calls a service / TQ mutation). The component receives the form instance and renders fields. The schema, validators, and any reset effects live in the hook.
- **Pages over modals for resource CRUD.** Resource create/edit lives at `/x/new` and `/x/$name` (or `/parent/x/$name` for nested) — not in modals. Modal pattern is reserved for short, transient flows (e.g. relay-key create/edit, provider-key edit). When using a modal, pass `open` into the form hook; the hook calls `form.reset()` on close.

## State management (the only four)

- **Server state** → TanStack Query. Centralize as `queryOptions(...)` in `src/api/hooks/<domain>.ts` and reuse the same options object in loaders, `useQuery`, and `useSuspenseQuery` — never redeclare keys inline. Components call domain hooks (`useModels`, `useRateLimits`), not the queryOptions directly.
- **Forms** → `@tanstack/react-form` controls field state and submit; **zod** owns schema + validation. Submit-time validation, errors render inline with `aria-invalid`/`aria-describedby`. The form instance lives in a `useXForm()` hook (see Frontend layering).
- **Cross-component / persisted client state** → zustand stores in `src/stores/`. Use `persist` middleware for anything that should survive reload (theme, etc.). Components read stores **through a domain hook**, not by importing `useFooStore` directly.
- **Component-local ephemeral state** → `useState` only for things scoped to a single component (input draft, hover, modal-open). Anything shared moves to a zustand store.

Never `useEffect` for fetching, and never store query results in `useState`.

## Styling

- **shadcn (luma) is the primitive layer.** `src/components/ui/*` is owned, not vendored — `bun x shadcn@latest add <component>` adds them; customize freely. Built on `@base-ui/react`. Biome ignores `src/components/ui/**` (vendor-generated lint warnings aren't ours to fix).
- **Use semantic tokens, not raw colors.** `bg-card`, `text-foreground`, `border-border`, `bg-muted`, `text-muted-foreground`, `bg-primary`, `text-primary-foreground`, `bg-popover`, `text-destructive`, `ring-ring`, etc. Never `bg-white dark:bg-neutral-900`, `text-neutral-500`, `border-neutral-200 dark:border-neutral-800`, `focus-visible:ring-brand-500`. The `colorsweep.sh`-style fix is a sign you should be writing semantic tokens up front.
- **Brand scales (`brand-*`, `accent-*`, `neutral-*`, `danger-*`)** are declared in `src/styles/theme.css` (the vendored design tokens) and are available as Tailwind utilities, but reach for them only when a semantic token doesn't fit (e.g. illustration accents). Never hard-code Tailwind palette names (`gray-*`, `blue-*`, etc.).
- **Token plumbing.** `src/styles.css` imports `tailwindcss` → `src/styles/theme.css` (brand scales + initial semantic tokens) → `src/styles/globals.css` (shadcn-luma overrides + sidebar/chart tokens + `@theme inline` bridges so `border-border`, `bg-background` etc. resolve in Tailwind v4). globals.css **wins** for the semantic palette — that's intentional.
- **Don't override sizing on shadcn primitives** unless asked. `Input` is `h-9`, `Select` is `h-7`, etc. Mismatch is the system. If a row needs uniform heights, override deliberately and consistently.
- **Never reach for native `<select>` / toggle buttons.** Use shadcn `Select` and `ToggleGroup` so chrome stays consistent (the macOS native picker breaks the design). For a segmented single-select, use `ToggleGroup` (value is a `string[]` in base-ui — pass `[value]`, guard the empty case). **base-ui `Select` gotcha:** `SelectValue` renders the raw *value*, not the label — pass `items={[{label,value}]}` to `Select.Root` or the trigger shows the id. Heights: `SelectTrigger` defaults to `data-[size=default]:h-9`; pass `size="sm"` for `h-7` (a `h-7` className won't win over the data-attr variant).
- **Number inputs:** native spinners stripped globally in `globals.css`. shadcn doesn't ship that fix; we add it.

## Commands

- `bun run dev` — vite dev server on :5140 (proxies to the control plane at `RELAY_CONTROL_TARGET`, default `http://localhost:8080`)
- `bun run typecheck` — `tsc --noEmit` (must pass; see TypeScript rules)
- `bun run check` — biome check
- `bun run ci` — typecheck + lint (run before declaring work done)
- `make gen` — regenerate `src/api/types.gen.ts` from `RELAY_URL` (default `http://localhost:8080`). Uses `curl -sk` to avoid TLS issues. `bun run gen:api` works the same way.

## TypeScript rules (non-negotiable)

- **Never escape the type system.** No `any`, no `as unknown as T`, no `@ts-ignore`/`@ts-expect-error`, no non-null `!` to silence errors. If the types disagree with your code, the code is wrong — fix it.
- `as` casts only for genuinely unrepresentable narrowings (e.g. `as const`, branded types, discriminated tag literals). Prefer type guards, `satisfies`, generics, and proper narrowing.
- `verbatimModuleSyntax` is on: use `import type` for type-only imports, `export type` for type-only exports.
- `strict`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedSideEffectImports` are on. Don't disable; comply.
- Never edit `src/api/types.gen.ts` or `src/routeTree.gen.ts` — regenerate them.
- Derive types from the OpenAPI schema (`paths`, `components["schemas"][...]`) rather than redeclaring shapes.

## React rules

- React 19 + `react-jsx` runtime — no `import React` for JSX.
- Function components only. No class components, no `forwardRef` (refs are plain props in 19), no `React.FC`.
- Hooks: respect rules-of-hooks; stable dependency arrays; no conditional hooks.
- Don't reach for `useEffect` to derive state — compute during render or use `useMemo`. Effects are for syncing with external systems only.
- No `useCallback`/`useMemo` cargo-culting; add only when there's a measured reason or referential identity matters for a downstream hook.
- Keys must be stable IDs, never array indices for dynamic lists.
- Prefer Suspense + `use()` for awaited values where it fits; keep loading/error UI co-located.
- Server state belongs in TanStack Query, not `useState`/`useEffect`.

## TanStack Router rules

- File-based routing via `@tanstack/router-plugin`; routes live in `src/routes/`. `routeTree.gen.ts` is generated — never hand-edit.
- Use typed APIs: `createFileRoute`, `Link`, `useNavigate`, `useParams({ from })`, `useSearch({ from })`, `useLoaderData({ from })`. Always pass `from`/`to` so params and search are typed.
- Validate search params with `validateSearch` (zod or a typed function); never read untyped `location.search`.
- Prefer route `loader`s for data that gates render; integrate with Query via `context.queryClient.ensureQueryData(...)` so loaders and components share a cache.
- Use `<Link>` for navigation, not `<a href>`. No `window.location` for in-app nav.
- Don't put runtime side effects at module top-level in route files outside the route definition.

## TanStack Query rules

- One `QueryClient` at the app root; pass it through router `context` so loaders can use it.
- Centralize keys and fetchers as **query options** (`queryOptions({ queryKey, queryFn })`). Reuse the same options object in loaders, `useQuery`, and `useSuspenseQuery` — don't redeclare keys inline.
- Query keys are arrays starting with a stable domain string, then params: `["issues", { status, page }]`. Keep them serializable.
- Use `useSuspenseQuery` for data the UI requires; `useQuery` only when an explicit non-Suspense loading state is needed.
- Mutations: `useMutation` with explicit `onSuccess`/`onError`; invalidate via `queryClient.invalidateQueries({ queryKey })`. Prefer invalidation over manual `setQueryData` unless doing an optimistic update.
- Don't fetch in `useEffect`. Don't store query results in `useState`.
- `staleTime`/`gcTime` are deliberate decisions — set them on the query options, not ad-hoc per call site.
- All fetchers go through `openapi-fetch` against `src/api` so request/response types stay tied to the OpenAPI schema.

## Style

- Tailwind v4 utilities; no inline `style` unless dynamic values require it.
- Imports use `@/...` for src.
- Biome owns formatting and lint — run `bun run check` before finishing. `src/components/ui/**` and `src/styles/**` are biome-ignored (vendored / Tailwind directives).

## Layout

**Domain folders** own their components, hooks, and contexts together. Shared infra (api, stores, lib, types) lives outside.

```
src/
  policies/     PolicyForm, PolicyRLPicker, PolicyHostRequirements, usePolicyForm, …
  host-keys/    HostKeyForm, SecretRotateDialog, useHostKeyForm, …
  relay-keys/   RelayKeyForm, useRelayKeyForm
  rate-limits/  RateLimitForm, AttachRateLimitModal, useRateLimitForm
  models/       ModelsTable, ModelPicker
  hosts/        HostsTable, HostLogo
  shell/        Layout, Sidebar (app chrome, not a domain)
  shared/       cross-domain primitives: IdentitySection, EnabledField, MultiSelect, …
  components/ui/  vendored shadcn (biome-ignored)

  api/          OpenAPI-bound services + per-domain queryOptions
  stores/       zustand
  lib/          pure utilities (catalogRef, displayLabel, …)
  diagnostics/  health analyzers
  config/       constants
  routes/       TanStack file-based routes (framework-locked)
```

**Rules** (non-negotiable):

1. **Components, hooks, and contexts stay in their domain folder.** A `.tsx` and its `useXForm.ts` always sit together.
2. **`.tsx` files never import from `@/api/...` or `@/stores/...` directly.** Wrap them in a domain hook (TQ `queryOptions`, store selector, etc.) and import the hook from the same folder.
3. **Cross-domain UI/logic lives in the domain that owns the binding** — the higher node in the dependency DAG. Example: `PolicyHostRequirements` derives hosts from a policy's catalog refs → it lives in `policies/`, not in `hosts/`. Don't lift it to `shared/`.
4. **Dependency direction is downward.** Rough DAG:
   `relay-keys → policies → { host-keys → hosts, rate-limits, models }`
   A higher domain may import from a lower one. Reverse is a smell — refactor instead. No circular imports between domains.
5. **Routes are slim orchestrators.** Parse params → call domain hook → render domain component. No business logic, no cross-domain composition there.
6. **`shared/`** is for genuinely domain-agnostic primitives only. If you're tempted to put something there, first check whether it's actually one domain reaching into another (lift to that owning domain instead).
7. **`components/ui/`** is vendored shadcn — owned, not vendored-as-dep; customize freely but treat it as the primitive layer, not a domain.

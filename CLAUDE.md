# relay-ui

Operator admin UI for **Wyolet Relay** (high-throughput Go LLM router). Built as a static SPA, embedded into the Relay binary via `//go:embed`, served at `/ui/`.

- Upstream API: `wyolet/relay` Go service; types come from its `/openapi.json`.

React 19 + Vite + TanStack Router + TanStack Query + Tailwind v4 + Biome + shadcn (luma) on `@base-ui/react`.
Path alias: `@/*` → `src/*` (configured in `tsconfig.json` paths and `vite.config.ts` resolve.alias). Package manager: bun.

## Frontend layering (non-negotiable)

Mirrors the wyolet workspace project. The point: redesigning a page should be **swapping components, not rebuilding logic**. That only works if logic lives outside.

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
- **Brand scales (`brand-*`, `accent-*`, `neutral-*`, `danger-*`)** still come from `@wyolet/design/theme.css` and are available as Tailwind utilities, but reach for them only when a semantic token doesn't fit (e.g. illustration accents). Never hard-code Tailwind palette names (`gray-*`, `blue-*`, etc.).
- **Token plumbing.** `src/styles.css` imports `tailwindcss` → `@wyolet/design/theme.css` (brand scales + initial semantic tokens) → `src/styles/globals.css` (shadcn-luma overrides + sidebar/chart tokens + `@theme inline` bridges so `border-border`, `bg-background` etc. resolve in Tailwind v4). globals.css **wins** for the semantic palette — that's intentional.
- **Don't override sizing on shadcn primitives** unless asked. `Input` is `h-9`, `Select` is `h-7`, etc. Mismatch is the system. If a row needs uniform heights, override deliberately and consistently.
- **Number inputs:** native spinners stripped globally in `globals.css`. shadcn doesn't ship that fix; we add it.

## Commands

- `bun run dev` — vite dev server on :5140 (matches Caddy reverse_proxy)
- `bun run typecheck` — `tsc --noEmit` (must pass; see TypeScript rules)
- `bun run check` — biome check
- `bun run ci` — typecheck + lint (run before declaring work done)
- `make gen` — regenerate `src/api/types.gen.ts` from `RELAY_URL` (default `https://relay.wyolet.dev`). Uses `curl -sk` to avoid TLS issues. `bun run gen:api` also works against `http://localhost:8080`.

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

## Layout (current → target)

We currently have a flat layout (`src/components/`, `src/stores/`, `src/api/hooks/`). The target shape — **domain folders** (`src/keys/`, `src/policies/`, `src/models/`, …) each owning `components/ hooks/ types.ts` — is in flight. Until that migration happens, place new domain-specific hooks (`usePolicyForm`, `useCreateRelayKeyForm`, etc.) next to the components that use them and migrate together when you split a domain out.

A small `src/components/_legacy/` exists for hand-rolled components we kept around as fallbacks (e.g. the pre-shadcn MultiSelect). Don't import from there in new code.

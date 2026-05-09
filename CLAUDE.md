# relay-ui

Operator admin UI for **Wyolet Relay** (high-throughput Go LLM router). Built as a static SPA, embedded into the Relay binary via `//go:embed`, served at `/ui/`.

- Linear project: [Wyolet Relay](https://linear.app/aliboyev/project/wyolet-relay-66b6cdcde707) — team `PER`. Tickets for this repo live there; ignore unrelated `PER-*` issues from other projects.
- Upstream API: `wyolet/relay` Go service; types come from its `/openapi.json`.

React 19 + Vite + TanStack Router + TanStack Query + Tailwind v4 + Biome.
Path alias: `@/*` → `src/*` (configured in `tsconfig.json` paths and `vite.config.ts` resolve.alias). Package manager: bun.

## State management (the only four)

- **Server state** → TanStack Query (loaders + `useSuspenseQuery`/`useQuery`/`useMutation`).
- **Forms** → `@tanstack/react-form` controls field state and submit; **zod** owns schema + validation. Submit-time validation, errors render inline with `aria-invalid`/`aria-describedby`.
- **Cross-component / persisted client state** → zustand stores in `src/stores/`. Use `persist` middleware for anything that should survive reload (theme, etc.). See `stores/theme.ts` and `stores/toast.ts` as the patterns to copy.
- **Component-local ephemeral state** → `useState` only for things scoped to a single component (input draft, hover, modal-open). Anything shared moves to a zustand store.

Never `useEffect` for fetching, and never store query results in `useState`.

Styling tokens come from `@wyolet/design/theme.css` — use `brand-*`, `accent-*`, `neutral-*`, `danger-*`. Never hard-code Tailwind palette names (`gray-*`, `blue-*`, etc.).

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
- Biome owns formatting and lint — run `bun run check` before finishing.

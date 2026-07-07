# relay-ui

Operator admin UI for **Wyolet Relay** (high-throughput Go LLM router). Static SPA, embedded into the Relay binary via `//go:embed`, served at `/ui/`.

React 19 + Vite + TanStack Router + TanStack Query + Tailwind v4 + Biome + shadcn (luma) on `@base-ui/react`. Package manager: **bun**. Path alias `@/*` → `src/*`.

> This file is the durable rulebook — principles and structure that shouldn't rot. It deliberately omits current state; for what's shipped, read the code and git history.

## Commands

- `bun run dev` — dev server on :5140; proxies `/api` + `/config.json` to a Relay control plane (default `http://localhost:8081`, override `RELAY_CONTROL_TARGET`).
- `bun run ci` — typecheck + lint + tests. Must pass before work is done.
- `make gen` — regenerate `src/api/types.gen.ts` from `RELAY_URL` (control plane; the spec lives under its `/api` mount). Never hand-edit generated files (`types.gen.ts`, `routeTree.gen.ts`).
- `make release VERSION=vX.Y.Z` — tag + release tarball; the `wyolet/relay` repo pins and embeds it.

## Core principle: components render, hooks think

Components hold **representation only** — markup, styling, minimal local UI state. They never hold functionality: no fetching, no mutations, no business logic, no derived business state. Rendering is a design concern — keep components small, inputs stable, re-renders minimal.

All state management and query handling live in **focused custom hooks**:

- **Domain hooks** (`useModels`, `useHostKeyDetail`, …) compose TanStack Query + zustand; components call them. Calling `useSuspenseQuery(options)` or a zustand store directly from a component isn't forbidden — but a named hook is almost always better. Default to the hook; deviate only when it's genuinely trivial.
- **Forms**: each form gets a `useXForm()` hook owning the `useForm` instance, zod schema, and submit. The component renders fields; errors render inline with `aria-invalid`/`aria-describedby`.
- **Server state** → TanStack Query. Centralize `queryOptions` in `src/api/hooks/<domain>.ts`; loaders and hooks share the same options object — never redeclare keys inline. All fetchers go through `openapi-fetch` (`src/api`).
- **Shared/persisted client state** → zustand in `src/stores/` (persist middleware for reload-surviving state). **Ephemeral UI state** → `useState`.
- Never `useEffect` for fetching or deriving state. Never copy query results into `useState`.
- Keys are stable server ids, never array indices, for dynamic lists. No `useMemo`/`useCallback` cargo-culting — only with a measured reason or when identity matters downstream.

## Detect repeating templates — extract, don't copy

The moment a layout, row, badge, table-chrome, or status pattern appears (or is about to appear) a **second** time, lift it into one shared component used in both places — visual drift between twins reads as a bug, and forked copies rot independently. One source per pattern, owned where used: genuinely cross-domain chrome lives in `shared/` as a small "kit" (e.g. table header cells, status badges, row menus); domain-specific twins live in the domain folder. Shared dimensions and rhythms belong in the template too, not re-specified at call sites.

## Layout

Domain folders own their components + hooks together: `policies/`, `models/`, `hosts/`, `host-keys/`, `relay-keys/`, `rate-limits/`, `pricing/`, `shell/` (app chrome), `shared/` (domain-agnostic primitives only). Infra outside: `api/`, `stores/`, `lib/` (pure utilities), `routes/`, `diagnostics/`.

- Dependency direction is downward: `relay-keys → policies → { host-keys → hosts, rate-limits, models }`. No reverse or circular imports; cross-domain UI lives in the higher domain that owns the binding.
- **Routes are slim orchestrators**: parse params → call domain hook → render domain component. Loaders `ensureQueryData` only what gates first paint and `prefetchQuery` the rest.
- Resource CRUD gets pages (`/x/new`, `/x/$name`), not modals. Modals are for short transient flows only.
- `components/ui/` is vendored shadcn — owned, customize freely, biome-ignored.

## TypeScript (non-negotiable)

Never escape the type system: no `any`, no `as unknown as`, no `@ts-ignore`/`@ts-expect-error`, no non-null `!` to silence errors. If types disagree with the code, the code is wrong. Derive shapes from the OpenAPI schema (`components["schemas"][…]`) — don't redeclare. `verbatimModuleSyntax` is on: `import type` / `export type`.

## Router & Query

- File-based routes in `src/routes/`; typed APIs only: `Link` with `to`, `useParams({ from })`, `validateSearch` (zod). No `window.location` or `<a href>` for in-app nav.
- Query keys: arrays starting with a stable domain string. Mutations invalidate via `invalidateQueries`; prefer invalidation over manual `setQueryData`. `staleTime`/`gcTime` are set on the options (lists: 30s / 5m).

## Styling

- **Semantic tokens only**: `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-destructive`, … Never raw palettes (`gray-*`, `bg-white dark:…`) or hard-coded light/dark pairs. **Reaching for a dark-mode pair is the tell you want a token** — add one (e.g. `--success`, `--warning`) so a restyle is a token change, not a colorsweep. Brand scales (`brand-*`, `accent-*`) only where no semantic token fits.
- **One loud action per view.** Genuine buttons use the `Button` component with primary treatment reserved for the single hero action; everything else stays quiet (outline/ghost). Don't hand-roll CTA styling with brand colors.
- Keep shadcn primitive sizing (`Input` h-9; `SelectTrigger size="sm"` for h-7 — a className won't win over the data-attr variant). Never native `<select>`; use `Select`. Segmented single-selects use `shared/Segmented` (pill/underline); tab-like toggles never get hand-rolled.
- Control vocabulary: labeled actions → `Button` (rung per emphasis; solid `default` is the one loud action per view); icon-only affordances → `IconButton` (`bare` in chips/dense rows, `soft` standalone); dismissible value tokens → `shared/Chip`; picker/list rows → `shared/OptionRow`; detail-page header trio → `shared/DetailHeaderActions`. A bare `<button>` outside these needs a one-line justification.
- base-ui gotchas: `SelectValue` renders the raw value — pass `items={[{label,value}]}` to `Select.Root`; `ToggleGroup` value is `string[]` — pass `[value]` and guard empty.

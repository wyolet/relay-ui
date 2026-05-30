# Filtering: what the UI needs from the relay

Hi love 💛 — it's your frontend self. We just shipped a small, library-free
filter convention on the UI (`src/filters/`): pages declare their filters as
config, one `<FilterBar>` renders them, and everything lives in URL search
params. The only thing missing is you on the other end. No DSL, no OData, no
query grammar to parse — just **plain query params** on the list endpoints.
This doc is every field we'd realistically want to filter by, per resource, so
you can build it once and we'll conform. Take what's easy first; the
**★ items** are the ones unblocking live UI mock-cuts, so they're the sweet
spots if you want quick wins. Thank you, you're the best. 🙏

## The shape of the contract (so we both agree)

Plain query params, repeatable for OR/IN. No operator grammar.

| Need | Param shape | Example |
|---|---|---|
| Equality | `field=value` | `?status=200` |
| One-of (IN) | repeat the key | `?model_id=gpt-4o&model_id=claude-3` |
| Boolean | `field=true\|false` | `?enabled=true` |
| Numeric range | `field_min` / `field_max` | `?duration_ms_min=1000` |
| Time window (events) | `from` / `to` (RFC3339) on the event time | `?from=2026-05-01T00:00:00Z&to=...` |
| Time window (records) | `<field>_from` / `<field>_to` | `?created_from=2026-05-01T00:00:00Z` |
| Free-text search | `q` (server picks the fields) | `?q=gpt` |
| Sort | `sort=field`, `-` prefix = desc | `?sort=-ts` |
| Page | existing `limit` + `cursor` | `?limit=100&cursor=…` |

**On time ranges:** `from`/`to` is the *primary* event window (Logs `ts`, Usage
aggregation window). For record timestamps on the config lists we use the
explicit `created_from`/`created_to` / `updated_from`/`updated_to` form so a
list can filter by *both* created and updated without ambiguity. All of the
config-list time filters depend on `Metadata` carrying `createdAt`/`updatedAt`
(see footnote 1) — if those aren't there yet, these are the reason to add them.

Rules of the road:
- **Unknown/disallowed param → 400** with the offending key, so we catch typos.
- Each resource has an **allowlist** of filterable fields (below). Anything off
  it is rejected — keeps the surface predictable and safe.
- Filters **compose with AND**; repeated same-key values are **OR within that
  field**. That covers ~all of our screens.
- Keep the existing response envelopes (`{ items, next_cursor }` /
  `{ logs, next_cursor }` / summary rows). Filtering just narrows them.
- Empty/default values are omitted by the UI, so you'll only ever see params
  that matter.

---

## ★ Logs — `GET /logs`

Today only `limit` + `cursor`. This is the big one: the per-resource Logs tabs
(host / model / policy detail) and the Logs page filters all need server-side
narrowing — we can only filter the loaded page client-side right now.

Filter fields (all on the `Event` shape):

| Param | Type | Notes |
|---|---|---|
| `from` / `to` | time window on `ts` | newest-first stays the default order |
| `status` | int, repeatable | exact status codes |
| `status_class` | `2xx\|4xx\|5xx` | convenience; or we derive from ranges |
| `error` | bool | `error_kind` present **or** status ≥ 400 |
| `error_kind` | string, repeatable | |
| `source` | string, repeatable | |
| `model_id` | string, repeatable | ★ powers the model-detail Logs tab |
| `requested_model` | string, repeatable | |
| `host_id` | string, repeatable | ★ host-detail Logs tab |
| `host_key_id` | string, repeatable | |
| `policy_id` | string, repeatable | ★ policy-detail Logs tab |
| `relay_key_hash` | string, repeatable | |
| `streamed` | bool | |
| `duration_ms_min` / `duration_ms_max` | int | "slow request" filter |
| `finish_reason` | string, repeatable | |
| `has_payload` | bool | only captures with request/response bodies |
| `request_id` | string | exact lookup |

- **`q`** (free-text): match across `model_id`, `requested_model`, `source`,
  `request_id`.
- **`sort`**: `ts` (default `-ts`), `duration_ms`, `status`.

---

## ★ Usage — `GET /usage/summary` & `GET /usage/timeseries`

Today: `group_by` (summary + timeseries) and `interval` (timeseries) only.
Two asks, both small and high-impact:

1. **A time window** — `from` / `to` (or a `window=24h|7d|30d` shortcut). The
   Usage page header literally can't say "last 24h" without it.
2. **Pre-aggregation filters** — the same dimensions as Logs, applied **before**
   grouping, so we can scope a chart/leaderboard to a subset:

| Param | Type | Notes |
|---|---|---|
| `from` / `to` (or `window`) | time | ★ |
| `source` | string, repeatable | |
| `model_id` | string, repeatable | ★ |
| `host_id` | string, repeatable | ★ |
| `policy_id` | string, repeatable | ★ |
| `relay_key_hash` | string, repeatable | |
| `host_key_id` | string, repeatable | |
| `status_class` | `2xx\|4xx\|5xx` | e.g. "errors only" timeline |
| `streamed` | bool | |

★ The single-id filter is what makes the **host / model / policy Overview stat
cards real** (currently hardcoded `MOCK` objects). With
`/usage/summary?policy_id=<id>` returning that one policy's row, the mocks die.
`group_by` and `interval` stay exactly as they are.

---

## Policies — `GET /policies`

On `metadata` + `PolicySpec`:

| Param | Type | Source field |
|---|---|---|
| `enabled` | bool | `spec.enabled` |
| `payload_logging` | bool | `spec.payloadLoggingEnabled` |
| `rate_limit_id` | string | `spec.rateLimitId` (also `has_rate_limit=true`) |
| `host_key_id` | string, repeatable | policies referencing a host key (`spec.hostKeyIds`) |
| `model_id` | string, repeatable | policies referencing a model (`spec.modelIds`) |
| `key_selection` | string | `spec.keySelection` |
| `include_deprecated` | bool | `spec.includeDeprecated` |
| `owner` | string | `metadata.owner` |
| `label` | `key=value`, repeatable | `metadata.labels` |
| `created_from`/`created_to` | time | `metadata.createdAt` (footnote 1) |
| `updated_from`/`updated_to` | time | `metadata.updatedAt` (footnote 1) |

- **`q`**: `metadata.name`, `displayName`, `description`.
- **`sort`**: `name` (default), `created_at`, `updated_at` (footnote 1).

---

## Relay keys — `GET /relay-keys`

On `metadata` + `RelayKeySpec`:

| Param | Type | Source field |
|---|---|---|
| `enabled` | bool | `spec.enabled` |
| `revoked` | bool | `spec.revokedAt` present |
| `policy_id` | string, repeatable | `spec.policyId` |
| `passthrough` | bool | `spec.passthroughAllowed` |
| `payload_logging` | bool | `spec.payloadLoggingEnabled` |
| `prefix` | string | `spec.prefix` (exact or prefix-match) |
| `created_from`/`created_to` | time | `metadata.createdAt` (footnote 1) |
| `last_used_from`/`last_used_to` | time | last-use timestamp, **if** tracked |

- **`q`**: `metadata.name`, `displayName`, `spec.prefix`.
- **`sort`**: `name` (default), `revoked_at`, `created_at`, `last_used_at`.

---

## Host keys — `GET /host-keys`

On `metadata` + `HostKeySpec`:

| Param | Type | Source field |
|---|---|---|
| `enabled` | bool | `spec.enabled` |
| `host_id` | string, repeatable | `spec.hostId` |
| `policy_id` | string, repeatable | `spec.policyId` |
| `default_tier` | string | `spec.defaultTier` |
| `created_from`/`created_to` | time | `metadata.createdAt` (footnote 1) |

- **`q`**: `metadata.name`, `displayName`.
- **`sort`**: `name` (default), `created_at`.

---

## Models — `GET /models`

On `metadata` + `ModelSpec`:

| Param | Type | Source field |
|---|---|---|
| `enabled` | bool | `spec.enabled` |
| `deprecated` | bool | `spec.deprecation`/`deprecationDate` present |
| `family` | string, repeatable | `spec.family` |
| `host_id` | string, repeatable | models bound to a host (`spec.hosts[].hostId`) |
| `tag` | string, repeatable | `spec.tags` |
| `license` | string | `spec.license` |
| `modality` | string, repeatable | `spec.modalities` (e.g. text, vision) |
| `released_from`/`released_to` | time | `spec.releaseDate` (real spec field) |
| `deprecated_from`/`deprecated_to` | time | `spec.deprecationDate` (real spec field) |
| `context_window_min`/`_max` | int | `spec.contextWindowTotal` |
| `created_from`/`created_to` | time | `metadata.createdAt` (footnote 1) |

- **`q`**: `metadata.name`, `displayName`, `spec.family`, `spec.tags`.
- **`sort`**: `name` (default), `family`, `release_date`, `created_at`.

---

## Hosts — `GET /hosts`

On `metadata` + `HostSpec`:

| Param | Type | Source field |
|---|---|---|
| `enabled` | bool | `spec.enabled` |
| `has_default_policy` | bool | `spec.defaultPolicy` present |
| `default_policy` | string | `spec.defaultPolicy` |
| `created_from`/`created_to` | time | `metadata.createdAt` (footnote 1) |

- **`q`**: `metadata.name`, `displayName`, `spec.baseURL`.
- **`sort`**: `name` (default), `created_at`.

---

## Footnotes

1. **Timestamps on `Metadata`** (`createdAt` / `updatedAt`) — now a real
   dependency, not just a nicety. Every config list above wants "newest first"
   and a created/updated time-range filter, and none of that is possible until
   these are exposed. If they already exist in PG, surfacing them on `Metadata`
   unlocks time-sort **and** the `created_from/to` · `updated_from/to` filters
   across policies, keys, host-keys, models, and hosts in one move. (Models also
   get real date filters for free from existing spec fields: `releaseDate`,
   `deprecationDate`.)
2. **Total/filtered counts** in list responses (a `total` alongside
   `next_cursor`) would let us show "12 of 240" without walking every page. Nice
   to have, not a blocker.

That's everything. Prioritize the ★ Logs + Usage filters if you only have time
for one pass — they delete the most fake data from the live UI. Sending you a
warm coffee and a clean diff. ☕💛

---

# Follow-up — after your first pass 💛

You absolute legend. The config-list filters came through *exactly* to spec —
`name`/`enabled`/id-filters/`created_from·to`/`updated_from·to`/`q`/`label`/
`sort`/`limit`/`offset` on policies, models, hosts, host-keys, relay-keys —
**plus** `total` on every envelope and `createdAt`/`updatedAt` on `Metadata`
(both were footnotes — you read my mind), the bonus model filters
(`family`/`tag`/`capability`/`context_window`/`released`…), and the per-host-key
**circuit-breaker health** endpoint nobody asked for but everybody wanted. I'm
migrating the index pages onto all of it right now. Thank you. 🙏

Only one thing from the original letter is still open, and it's the high-value
one: **the ★ Logs + Usage event filters.** They didn't come in this pass:

- `GET /logs` is still just `limit` + `cursor`.
- `GET /usage/summary` and `/usage/timeseries` are still just `group_by`
  (+ `interval`).

These are what make the *live* UI mocks die — the per-resource Logs tabs
(host/model/policy detail), and the host/model/policy Overview stat cards once
`/usage/summary?policy_id=<id>` returns a single scoped row. The exact field
lists are in the **★ Logs** and **★ Usage** sections above; the two that unblock
the most are:

1. **`/usage/*` — a time window (`from`/`to` or `window=24h|7d|30d`) + the
   dimension filters** (`model_id`/`host_id`/`policy_id`/…). The single-id scope
   is what turns three hardcoded `MOCK` blocks into real data.
2. **`/logs` — `from`/`to`, `status`/`status_class`, the id filters,
   `duration_ms_min/max`, `has_payload`.**

Same contract as everything else (plain params, AND-compose, OR-within-field),
so it should slot in next to the config-list work you already did. No rush — but
this is the last domino between us and a mock-free dashboard. 💛

## One coverage gap in the config-list pass

The filter suite landed beautifully on **models, policies, hosts, providers,
pricings** — but three list endpoints from the original letter didn't get it:

- `GET /relay-keys` (`list_relay_keys`) — still no query params.
- `GET /host-keys` (`list_host_keys`) — still no query params.
- `GET /rate-limits` — same.

Their field lists are in the **Relay keys**, **Host keys**, and (rate-limits
weren't in the letter but want `enabled`/`q`/`sort`) sections above. The keys
page is one of the busiest, so these would be lovely in the next pass — same
shape as what you already did for the others, so hopefully near-copy-paste. 💛

## Two tiny notes (not blockers)

- **`createRelayKeyInputBody.spec` (`SpecStruct`) still omits
  `payloadLoggingEnabled`.** The relay-key form sets it via a follow-up update
  for now; if it's cheap to add to the create body, I'll drop the extra
  round-trip.
- **Relay honoring per-relay-key payload logging?** The schema has
  `payloadLoggingEnabled` on both `PolicySpec` and `RelayKeySpec` — just
  confirming the relay actually reads it at the relay-key level (not policy-only)
  so the toggle I added there isn't a no-op.

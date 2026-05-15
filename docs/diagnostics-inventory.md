# Diagnostics inventory — addressed

Triaged with the backend owner. This is the working list for the FE
implementation.

**Legend**

- **BE-enforce** — backend rejects/cascades; FE check is redundant.
- **BE-soon** — backend will own this after a planned PR (named below).
- **FE-owns** — pure display / form ergonomics, BE stays tolerant.
- **DROP** — failure mode is impossible / not signal-bearing right now.

Severities:

- **error** — resource can't serve traffic, or a hard reference is broken.
- **warn** — degraded, or behavior the user wouldn't expect.
- **info** — orphan / cosmetic / intentional state.

---

## Relay Key

| # | Check | Verdict | Notes |
|---|---|---|---|
| 1 | `spec.policyId` dangling | **FE-owns** | No FK. After **BE-soon: B1 cascade**, policy delete strips this, so post-PR this becomes rare but still possible if PG is mutated outside the app. FE warn. |
| 2 | Attached policy is broken (transitive) | **FE-owns** | Short summary on relay-key, full list on `/policies/$id`. |
| 3 | Attached policy is disabled → 401 | **FE-owns** | Sanitizer keeps the disabled policy in PG; data plane returns 401. Warn. |
| 4 | Key revoked / past expiry | **DROP for now** | No `expiresAt`/`revokedAt` field exists. Add when telemetry/lifecycle lands. |
| 5 | Key disabled | **FE-owns** | Info badge. |
| 6 | Never used | **DROP** | No usage telemetry post-cutover (roadmap A2). |

## Policy

**Host-owned policies (provider tiers, `owner.kind="host"`) skip every check below.** They're reference shapes pointed at by host keys; they don't pool keys, can't be attached to relay keys, and their rate-limit / catalog state is the provider's contract — not something the operator fixes from this UI.

| # | Check | Verdict | Notes |
|---|---|---|---|
| 1 | `hostKeyIds` empty or all disabled → no upstream credential | **FE-owns** | Sanitizer drops dead hostkey ids from snapshot but PG keeps them. FE renders. |
| 2 | Every referenced hostkey's host disabled | **FE-owns** | Transitive — render on policy. |
| 3 | Catalog grants resolve to zero models | **FE-owns, sync** | Implemented locally via host-key reachability — no `/catalog/resolve` round-trip needed. **A2 will redefine grants** — empty `Spec.Models` will mean "allow anything reachable by hostkeys" instead of "grants nothing". After A2 the check becomes "no hostkeys reach any model" rather than "no grants resolve". |
| 4 | Some hostkeys disabled (degraded) | **FE-owns** | Warn. |
| 5 | `rateLimitId` / `rlBindings[]` ref disabled RL | **FE-owns** | The bootstrap-killer case is now backend-tolerant; UI surfaces it. **After BE-soon: B3**, RL delete will strip from rlBindings — so "missing" RL ids won't accumulate. "Disabled" RL stays a soft state requiring UI warn. |
| 6 | `rlBindings[]` scoped to a model not in this policy's catalog | **FE-owns** | Dead binding. Fires only when **all** of the binding's models are outside the catalog — partial overlap is intentional narrowing. |
| 7 | Multiple hosts in pool, no explicit `keySelection` | **DROP** | `EffectiveKeySelection()` defaults to `prioritized` — deterministic. |
| 8 | Policy disabled but attached to enabled relay keys | **FE-owns** | Warn. |
| 9 | No relay key attached | **FE-owns** | Info badge. |

## Host Key

| # | Check | Verdict | Notes |
|---|---|---|---|
| 1 | `spec.hostId` dangling | **FE-owns** | No FK. After **BE-soon: B2** (host not deletable), this becomes unreachable. Keep until B2 ships. |
| 2 | `spec.policyId` dangling | **BE-soon: A1** | Hostkey write-time rejected if not host-owned by `hostId`. Post-A1 you can drop this check. Until then, FE keeps. |
| 3 | `valueFrom.kind=env` with empty `env` / `stored` with no value | **DROP** | `hostkey.Validate()` enforces both. |
| 4 | Host disabled → unreachable | **FE-owns** | Warn. |
| 5 | Host-policy disabled | **FE-owns** | Warn. |
| 6 | Not attached to any user policy → orphan | **FE-owns** | Info. The hostkey `policies` derived field gives you this directly. |
| 7 | Disabled by user | **FE-owns** | Info. |

## Host

| # | Check | Verdict | Notes |
|---|---|---|---|
| 1 | Disabled but referenced by enabled keys/models | **FE-owns** | Warn. |
| 2 | `spec.defaultPolicy` dangling | **FE-owns** | Sanitizer clears in snapshot; PG retains. FE warns. |
| 3 | No host keys → unused | **FE-owns** | Info. |
| 4 | No model bindings → no surface | **FE-owns** | Info. |

**Host is not deletable (BE-soon: B2).** FE: hide / disable the delete button.

## Model

| # | Check | Verdict | Notes |
|---|---|---|---|
| 1 | `spec.hosts` empty | **DROP** | `model.Validate()` requires `min=1`. |
| 2 | Every binding's host disabled/deleted | **FE-owns** | Warn — model isn't reachable. |
| 3 | Deprecated / past `deprecationDate` | **FE-owns** | Warn badge. |
| 4 | All bindings have `enabled=false` | **FE-owns** | Warn. |
| 5 | Disabled but granted by enabled policies | **FE-owns** | Warn. |
| 6 | Not granted by any policy | **FE-owns** | Info; use `/catalog/resolve`. |

**Model is not deletable (BE-soon: B5).** FE: hide / disable delete.

## Rate Limit

| # | Check | Verdict | Notes |
|---|---|---|---|
| 1 | Disabled but referenced (silent no-op) | **FE-owns** | Warn — this is the bug class that taught us. |
| 2 | Rule meter/strategy outside system caps | **FE-owns** | Form-level. |
| 3 | Not referenced anywhere | **FE-owns** | Info. |
| 4 | Disabled by user | **FE-owns** | Info. |

## Provider

| # | Check | Verdict | Notes |
|---|---|---|---|
| 1 | Disabled with active models | **FE-owns** | Warn — blast radius. |
| 2 | No hosts | **FE-owns** | Info. |

**Provider is not deletable (BE-soon: B4).** FE: hide / disable delete.

## Pricing

| # | Check | Verdict | Notes |
|---|---|---|---|
| 1 | Points at deleted model | **DROP** | `pricing_models.model_id` is FK RESTRICT — can't dangle. |
| 2 | Model has no pricing | **FE-owns** | Info. |

---

## Cases the FE librarian missed

| # | Severity | Check | Owner |
|---|---|---|---|
| M1 | warn | Pricing duplicate `(model, host)` during edit/create | **BE-tracked: A3** (deferred). Until then, FE pre-check vs existing pricings on the same host. |
| M2 | error | Hostkey with `policyId` not host-owned by its `hostId` | **BE-soon: A1**. FE form already filters; backend will reject too. |
| M3 | error | Policy with both `rateLimitId` AND `rlBindings` set | **BE-enforce** — `policy.Validate()` rejects. FE form: radio between modes. |
| M4 | UX | Hostkey stored-mode `value` on edit — rotate vs preserve | **BE-soon: A4**. FE: split UI into "rotate" affordance (separate endpoint) vs metadata edit. |
| M5 | info | Host with `Policies` set but no hostkeys for any tier | **FE-owns**. |
| M6 | info | Model whose owning provider is disabled — model itself dropped from snapshot | **FE-owns**, but in the admin form (PG-direct), render the broken state explicitly. |
| M7 | UX | Frontend must handle the new `/references` endpoint for delete-confirm blast-radius dialogs | **BE-soon: B1+B3**. After this lands, the delete dialog should: call `/references` → render impact list → call delete. |

---

## What the BE PRs ship (FE can stop worrying about these in order)

- **A1** — hostkey policy ownership rejected at write. FE M2 stays as ergonomic filter.
- **A4** — `POST /host-keys/by-id/{id}/rotate`. PUT stops accepting `value`. FE rewrites the form (M4).
- **B1+B3** — `GET /{kind}/by-id/{id}/references` endpoint + RL delete cascade. FE wires the delete-confirm dialog (M7) and can simplify "in use by" rendering.
- **B2/B4/B5** — DELETE returns 405 on host/provider/model. FE hides the buttons.
- **A2** — empty `Spec.Models` semantics: separate PR; FE coverage analyzer needs to adapt when it lands.
- **Slug normalization** (separate ask) — sync currently uses upstream model name for both `metadata.name` and `spec.hosts[].upstreamName`, producing messy slugs (`ft:gpt-4o-mini-2024-07-18`). Normalize at sync time so slugs stay DNS-1123. FE relaxed `MODEL_SLUG_RE` as a shim; revert once shipped. Tracked in memory `project-model-slug-normalization`.

---

## Implementation shape (sketch)

```ts
type Severity = "error" | "warn" | "info";
type DiagCode =
  | "relay-key.policy-dangling"
  | "relay-key.policy-broken"
  | "relay-key.policy-disabled"
  | "relay-key.disabled"
  | "policy.no-host-keys"
  | "policy.host-keys-all-disabled"
  | "policy.host-disabled-transitive"
  | "policy.catalog-resolves-empty"
  | "policy.host-keys-degraded"
  | "policy.rate-limit-disabled"
  | "policy.rl-binding-dead"
  | "policy.disabled-with-relay-keys"
  | "policy.no-relay-keys"
  | "host-key.host-dangling"
  | "host-key.host-policy-dangling"
  | "host-key.host-disabled"
  | "host-key.host-policy-disabled"
  | "host-key.orphan"
  | "host-key.disabled"
  | "host.disabled-with-refs"
  | "host.default-policy-dangling"
  | "host.no-keys"
  | "host.no-bindings"
  | "model.all-hosts-unreachable"
  | "model.deprecated"
  | "model.all-bindings-disabled"
  | "model.disabled-with-grants"
  | "model.no-grants"
  | "rate-limit.disabled-with-refs"
  | "rate-limit.rule-outside-caps"
  | "rate-limit.orphan"
  | "rate-limit.disabled"
  | "provider.disabled-with-models"
  | "provider.no-hosts"
  | "pricing.model-missing-pricing";

interface Diagnostic {
  severity: Severity;
  code: DiagCode;
  message: string;
  link?: { to: string; params?: Record<string, string> };
}
```

- One `analyze<Resource>(resource, graph)` per kind. Pure / sync where
  possible; the catalog-resolve check (`policy.catalog-resolves-empty`)
  needs its own async hook.
- `buildGraph(allResources)` builds id → entity maps once.
- Domain hook `useDiagnostics(kind, id)` wires TQ list data → graph →
  analyzer; memoized.
- UI primitives: `<DiagnosticBadge />` (table rows — one dot at worst
  severity, count as tooltip), `<DiagnosticList />` (detail pages, with
  action links).

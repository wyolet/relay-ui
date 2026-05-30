/**
 * Canonical list of "not shippable yet" gaps blocking the OSS release —
 * every mock, stub, and no-op still hanging around the UI, plus what's
 * needed to make each one real. Surfaced loudly on the dashboard so nobody
 * forgets they exist. Delete entries here as they get cut/wired; when this
 * array is empty, the mocks are gone.
 */

export type GapOwner = "frontend" | "backend";

export interface ReleaseGap {
	/** Stable id (kebab-case). */
	id: string;
	/** Short imperative title — the thing to go do. */
	title: string;
	/** What's fake right now and where it lives. */
	whatsFake: string;
	/** What makes it real. */
	fix: string;
	/** Who owns the fix. "frontend" = we can wire it today; "backend" = blocked. */
	owner: GapOwner;
	/** Source locations, for whoever picks it up. */
	where: string[];
}

export const RELEASE_GAPS: ReleaseGap[] = [
	{
		id: "dashboard-metrics",
		title: "Replace dashboard 'Drop Counters' placeholder",
		whatsFake:
			"Dashboard shows a dashed 'metrics endpoint pending /admin/metrics' box. That endpoint never shipped.",
		fix: "There is no /admin/metrics — use /usage/summary + /usage/timeseries (already powering the Usage page) for top-line counters.",
		owner: "frontend",
		where: ["src/routes/_authenticated/index.tsx"],
	},
	{
		id: "resource-logs-tabs",
		title: "Make per-resource Logs tabs real",
		whatsFake:
			"Host/Model/Policy detail 'Logs' tabs are inline ComingSoon stubs.",
		fix: "Now unblocked — /logs takes ?host_id/model_id/policy_id. Render a filtered Logs feed in each detail tab (reuse the Logs page table).",
		owner: "frontend",
		where: [
			"src/hosts/HostDetailView.tsx",
			"src/models/ModelDetailView.tsx",
			"src/policies/PolicyDetailView.tsx",
		],
	},
	{
		id: "model-pricing",
		title: "Cut or back the model Pricing tab",
		whatsFake:
			"Model detail Pricing tab renders MOCK_PRICING (GPT-4-ish $2.50/$10 numbers + worked examples). Nothing in ModelSpec carries pricing.",
		fix: "Either remove the tab for OSS, or expose pricing fields on ModelSpec and wire them.",
		owner: "backend",
		where: ["src/models/ModelDetailView.tsx"],
	},
	{
		id: "delete-endpoints",
		title: "Real delete for models / hosts / policies",
		whatsFake:
			"The model row 'Delete' action fires a fake success toast ('Delete model — coming soon'). Hosts/policies have no delete at all.",
		fix: "No DELETE endpoint exists for these resources (delete?: never on every path). BE must add them; until then the action shouldn't pretend to work.",
		owner: "backend",
		where: ["src/models/ModelsTable.tsx"],
	},
	{
		id: "permission-edit-toggles",
		title: "Settings UI for edit-permission flags",
		whatsFake:
			"allowEdit flags (host-owned policies, models, providers, hosts) are hardcoded false and only togglable via localStorage in DevTools.",
		fix: "Surface them as toggles on a settings page.",
		owner: "frontend",
		where: ["src/stores/permissions.ts"],
	},
	{
		id: "global-payload-logging",
		title: "Global payload-logging default (settings)",
		whatsFake:
			"Payload logging is now toggleable per-policy and per-relay-key, but the global default (which overrides both) has no UI — there's no settings endpoint for it.",
		fix: "BE needs a /settings/payload-logging endpoint mirroring /settings/proxy-mode; then add the settings toggle. Resolution order: global › policy › relay-key.",
		owner: "backend",
		where: ["src/routes/_authenticated/settings.tsx"],
	},
];

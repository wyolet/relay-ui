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
			"The model row 'Delete' action is disabled (no longer a fake toast); models/hosts/policies have no way to delete.",
		fix: "No DELETE endpoint exists for these resources (delete?: never on every path). BE must add them, then wire a real delete mutation + re-enable the action.",
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
];

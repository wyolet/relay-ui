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

export const RELEASE_GAPS: ReleaseGap[] = [];

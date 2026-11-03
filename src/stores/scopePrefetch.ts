import { create } from "zustand";

/** Warms the lists a form picks from, for one `usable_by` scope. */
export type ScopePrefetch = (usableBy: string) => void;

interface ScopePrefetchState {
	/** One per mounted create form placed by the work context. */
	prefetchers: ScopePrefetch[];
	add: (prefetch: ScopePrefetch) => void;
	remove: (prefetch: ScopePrefetch) => void;
}

export const useScopePrefetchStore = create<ScopePrefetchState>()((set) => ({
	prefetchers: [],
	add: (prefetch) =>
		set((s) => ({ prefetchers: [...s.prefetchers, prefetch] })),
	remove: (prefetch) =>
		set((s) => ({ prefetchers: s.prefetchers.filter((p) => p !== prefetch) })),
}));

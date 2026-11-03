import { useEffect } from "react";
import {
	type ScopePrefetch,
	useScopePrefetchStore,
} from "@/stores/scopePrefetch";

/**
 * While mounted, the workspace menu runs `prefetch` for each scope it lists
 * when it opens, so switching finds the form's lists cached. Pass a stable
 * function; undefined registers nothing.
 */
export function useScopePrefetch(prefetch: ScopePrefetch | undefined): void {
	useEffect(() => {
		if (!prefetch) return;
		const { add, remove } = useScopePrefetchStore.getState();
		add(prefetch);
		return () => remove(prefetch);
	}, [prefetch]);
}

/** Runs every registered prefetch for each scope. */
export function prefetchScopes(usableBys: readonly string[]): void {
	for (const prefetch of useScopePrefetchStore.getState().prefetchers) {
		for (const usableBy of usableBys) prefetch(usableBy);
	}
}

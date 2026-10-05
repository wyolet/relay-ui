/**
 * Route loaders block first paint ("enter"/"preload"), but a filter change
 * re-runs them with cause "stay" under a new match id — awaiting there makes
 * the router swap the mounted page for its pending spinner. The list's own
 * query (see `useDeferredSearch`) surfaces loading and errors instead.
 */
export function awaitOnEnter<T>(
	cause: "enter" | "stay" | "preload",
	load: Promise<T>,
): Promise<T> | undefined {
	if (cause !== "stay") return load;
	load.catch(() => {});
	return undefined;
}

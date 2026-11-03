/** The list with the item at `index` swapped one step toward `delta`'s side; out of range is a no-op copy. */
export function moveItem<T>(
	list: readonly T[],
	index: number,
	delta: -1 | 1,
): T[] {
	const target = index + delta;
	if (index < 0 || index >= list.length || target < 0 || target >= list.length)
		return [...list];
	const next = [...list];
	[next[index], next[target]] = [next[target], next[index]];
	return next;
}

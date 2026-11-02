/** Items with any field containing the query, case-insensitive; all on a blank query. */
export function filterByText<T>(
	items: T[],
	q: string,
	fields: (item: T) => string[],
): T[] {
	const ql = q.trim().toLowerCase();
	if (!ql) return items;
	return items.filter((it) =>
		fields(it).some((f) => f.toLowerCase().includes(ql)),
	);
}

import type { components } from "@/api/types.gen";
import { DetailEmpty, DetailListRow } from "@/shared/DetailCard";

type Reference = components["schemas"]["referenceItem"];

/** Rows pointing at a resource. One row may refer in several ways, so `via` is part of its identity. */
export function ReferencesList({
	items,
	empty,
}: {
	items: readonly Reference[] | null | undefined;
	empty: string;
}) {
	if (!items || items.length === 0) return <DetailEmpty>{empty}</DetailEmpty>;
	return (
		<ul className="divide-y divide-border">
			{items.map((r) => (
				<DetailListRow key={`${r.kind}:${r.id}:${r.via}`}>
					<span className="min-w-0 truncate text-foreground">{r.name}</span>
					<span className="flex shrink-0 flex-wrap justify-end gap-x-3 text-muted-foreground">
						<span>{r.kind}</span>
						<code className="font-mono">{r.via}</code>
					</span>
				</DetailListRow>
			))}
		</ul>
	);
}

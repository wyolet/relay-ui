import type { components } from "@/api/types.gen";
import { DetailEmpty } from "@/shared/DetailCard";

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
				<li
					key={`${r.kind}:${r.id}:${r.via}`}
					className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0 text-xs"
				>
					<span className="text-foreground">{r.name}</span>
					<span className="text-muted-foreground">
						{r.kind} · <code className="font-mono">{r.via}</code>
					</span>
				</li>
			))}
		</ul>
	);
}

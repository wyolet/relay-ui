import type { ReactNode } from "react";

export interface Fact {
	label: string;
	value: ReactNode;
}

/** A few labeled facts on one wrapping line, each label beside its value. */
export function Facts({ items }: { items: Fact[] }) {
	return (
		<dl className="flex min-w-0 flex-wrap items-baseline gap-x-5 gap-y-1">
			{items.map((f) => (
				<div key={f.label} className="flex items-baseline gap-1.5">
					<dt className="text-meta text-ink-3">{f.label}</dt>
					<dd className="text-label text-foreground tabular-nums">{f.value}</dd>
				</div>
			))}
		</dl>
	);
}

import type { ReactNode } from "react";

/** One labelled fact about a request: a grey label over its value. */
export function Field({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<div className="min-w-0">
			<dt className="text-meta text-ink-3">{label}</dt>
			<dd className="truncate text-label text-foreground">{children}</dd>
		</div>
	);
}

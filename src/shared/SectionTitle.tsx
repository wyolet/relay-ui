import type { ReactNode } from "react";

/** Small uppercase heading over a detail-page section; `aside` is a muted
 * count or summary at its right. */
export function SectionTitle({
	children,
	aside,
}: {
	children: ReactNode;
	aside?: ReactNode;
}) {
	const title = (
		<h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
			{children}
		</h2>
	);
	if (aside === undefined) return title;
	return (
		<div className="mb-2 flex items-baseline justify-between gap-2">
			{title}
			<span className="text-[10px] text-muted-foreground tabular-nums">
				{aside}
			</span>
		</div>
	);
}

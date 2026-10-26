import type { ReactNode } from "react";

/** Style for the links under a {@link NoTraffic} statement. */
export const NO_TRAFFIC_ACTION =
	"text-label text-ink-2 transition-colors hover:text-foreground";

/** A read page's one statement when its slice has no traffic, in place of
 * figures, charts and tables that would all read zero. */
export function NoTraffic({
	title,
	children,
	actions,
}: {
	title: string;
	children: ReactNode;
	actions?: ReactNode;
}) {
	return (
		<div className="grid max-w-xl content-start gap-2.5 py-4">
			<h2 className="font-display text-mini-figure text-foreground">{title}</h2>
			<p className="text-label text-ink-2">{children}</p>
			{actions && (
				<div className="mt-1.5 flex flex-wrap gap-x-6 gap-y-2">{actions}</div>
			)}
		</div>
	);
}

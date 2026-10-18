import type { ReactNode } from "react";

/** A titled block on a read page: space and the heading separate it, no box.
 * `aside` sits at the right of the heading (a legend or a toggle). */
export function Section({
	title,
	meta,
	aside,
	children,
}: {
	title: string;
	meta?: string;
	aside?: ReactNode;
	children: ReactNode;
}) {
	return (
		<section className="grid min-w-0 content-start gap-4">
			<div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2">
				<div className="flex min-w-0 items-baseline gap-2.5">
					<h2 className="truncate font-display text-section text-foreground">
						{title}
					</h2>
					{meta && (
						<span className="shrink-0 text-meta text-ink-3">{meta}</span>
					)}
				</div>
				{aside}
			</div>
			{children}
		</section>
	);
}

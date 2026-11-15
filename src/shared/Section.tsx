import type { ReactNode } from "react";
import { TextPlaceholder } from "./TextPlaceholder";

/** A titled block on a read page: space and the heading separate it, no box.
 * `aside` sits at the right of the heading (a legend or a toggle). With `fill`
 * the content stretches to the height of the row the block sits in. */
export function Section({
	title,
	meta,
	aside,
	fill = false,
	children,
}: {
	title: string;
	/** A quiet note beside the title, or labeled facts. */
	meta?: ReactNode;
	aside?: ReactNode;
	fill?: boolean;
	children: ReactNode;
}) {
	return (
		<section
			className={`grid min-w-0 grid-cols-1 gap-4 ${fill ? "h-full grid-rows-[auto_minmax(0,1fr)]" : "content-start"}`}
		>
			<div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2">
				<div className="flex min-w-0 items-baseline gap-2.5">
					<h2 className="truncate font-display text-section text-foreground">
						{title}
					</h2>
					{meta && <div className="shrink-0 text-meta text-ink-3">{meta}</div>}
				</div>
				{aside}
			</div>
			{children}
		</section>
	);
}

/** A block's place while its data loads: the heading and a quiet area of the
 * content's height, no spinner. Untitled when the heading depends on data. */
export function SectionSkeleton({
	title,
	height,
}: {
	title?: string;
	/** A height class matching the loaded content, e.g. `h-[260px]`. */
	height: string;
}) {
	const area = <div className={`${height} rounded-bar bg-grid`} aria-hidden />;
	if (title) return <Section title={title}>{area}</Section>;
	return (
		<section
			className="grid min-w-0 grid-cols-1 content-start gap-4"
			aria-hidden
		>
			<span className="font-display text-section">
				<TextPlaceholder width="w-48" />
			</span>
			{area}
		</section>
	);
}

import type { ReactNode } from "react";
import { SectionTitle } from "@/shared/SectionTitle";

/** One compact stat tile: label, big value, optional sub-line. */
export function StatCard({
	label,
	value,
	sub,
	mono,
	valueClassName,
}: {
	label: string;
	value: string | number;
	sub?: string;
	mono?: boolean;
	valueClassName?: string;
}) {
	return (
		<div className="rounded-md border border-border bg-card px-3 py-2">
			<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</div>
			<div
				className={`mt-0.5 text-lg font-semibold tabular-nums ${
					mono ? "font-mono text-base" : ""
				} ${valueClassName ?? "text-foreground"}`}
			>
				{value}
			</div>
			{sub && (
				<div className="text-[11px] text-muted-foreground mt-0.5 truncate">
					{sub}
				</div>
			)}
		</div>
	);
}

const GRID_COLUMNS = {
	3: "sm:grid-cols-3",
	4: "sm:grid-cols-4",
};

/** Titled section holding a detail page's stat tiles. */
export function StatGrid({
	title,
	columns = 4,
	children,
}: {
	title: string;
	columns?: keyof typeof GRID_COLUMNS;
	children: ReactNode;
}) {
	return (
		<section>
			<SectionTitle>{title}</SectionTitle>
			<div className={`grid grid-cols-2 ${GRID_COLUMNS[columns]} gap-3`}>
				{children}
			</div>
		</section>
	);
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Switch } from "@/shared/Switch";

/** An open list's rows and labels share one grid; `cols` is its
 * `grid-cols-[…]` template, so spare width spreads across the columns. */
const LINE = "grid items-center gap-x-3 border-b border-rule";

/** The quiet column labels over a list of {@link LineRow}s. */
export function LineColumns({
	cols,
	children,
}: {
	cols: string;
	children: ReactNode;
}) {
	return (
		<div className={cn(LINE, cols, "pb-2 text-meta text-ink-3")}>
			{children}
		</div>
	);
}

/** One row on a hairline; a switched-off row dims. */
export function LineRow({
	cols,
	dimmed = false,
	children,
}: {
	cols: string;
	dimmed?: boolean;
	children: ReactNode;
}) {
	return (
		<div
			className={cn(
				LINE,
				cols,
				"py-2 text-label tabular-nums",
				dimmed && "opacity-60",
			)}
		>
			{children}
		</div>
	);
}

/** A right-aligned figure, or a quiet dash without one. */
export function NumberCell({ value }: { value: string | null }) {
	return (
		<span className={cn("text-right", value == null && "text-ink-3")}>
			{value ?? "—"}
		</span>
	);
}

/** A quiet word beside a row's name ("off", "deprecated"). */
export function QuietTag({
	children,
	className,
	title,
}: {
	children: string;
	className?: string;
	title?: string;
}) {
	return (
		<span
			title={title}
			className={cn("shrink-0 text-foot text-ink-3", className)}
		>
			{children}
		</span>
	);
}

/** The row's on/off switch, last or near-last in the grid. */
export function SwitchCell(props: {
	checked: boolean;
	onChange: (next: boolean) => void;
	disabled?: boolean;
	label: string;
}) {
	return (
		// pr-3 holds the switch's enlarged hit area inside the row.
		<span className="flex items-center justify-end pr-3">
			<Switch {...props} />
		</span>
	);
}

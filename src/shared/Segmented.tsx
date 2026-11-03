import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// The one tab-like single-select segment control. base-ui's ToggleGroup ships
// a muted-fill chrome that matches none of our segment looks, so this owns the
// two visual languages we actually use:
//   · "pill"      — segments in a tinted tray, active one floats (theme picker,
//                   period pills, metric switch).
//   · "underline" — flush tabs with an active bottom border (detail-panel tabs).
// One keyboard-focusable button per option, one aria-pressed contract.

export interface SegmentedOption<T extends string> {
	value: T;
	label: ReactNode;
	/** Accessible name when the label is icon-only. */
	ariaLabel?: string;
}

const CONTAINER = {
	pill: "inline-flex items-center gap-0.5 rounded-md bg-muted p-0.5",
	underline: "flex gap-1 border-b border-border px-2",
} as const;

function itemClass(
	variant: "pill" | "underline",
	active: boolean,
	stretch: boolean,
): string {
	if (variant === "underline") {
		return cn(
			"border-b-2 px-2.5 py-2 text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
			active
				? "border-primary text-foreground"
				: "border-transparent text-muted-foreground hover:text-foreground",
		);
	}
	return cn(
		"inline-flex items-center justify-center rounded-[5px] px-2 py-0.5 text-[11px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
		stretch && "flex-1",
		active
			? "bg-background text-foreground shadow-sm"
			: "text-muted-foreground hover:text-foreground",
	);
}

export function Segmented<T extends string>({
	options,
	value,
	onChange,
	variant = "pill",
	stretch = false,
	className,
}: {
	options: readonly SegmentedOption<T>[];
	value: T;
	onChange: (value: T) => void;
	variant?: "pill" | "underline";
	/** Pill only: segments share the row width equally. */
	stretch?: boolean;
	className?: string;
}) {
	return (
		<div className={cn(CONTAINER[variant], stretch && "w-full", className)}>
			{options.map((o) => {
				const active = o.value === value;
				return (
					<button
						key={o.value}
						type="button"
						aria-pressed={active}
						aria-label={o.ariaLabel}
						onClick={() => onChange(o.value)}
						className={itemClass(variant, active, stretch)}
					>
						{o.label}
					</button>
				);
			})}
		</div>
	);
}

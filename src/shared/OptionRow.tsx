import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// The one full-width option row: a click target for picker/list entries
// (a leading checkbox/logo, a label, trailing meta). Owns the button element
// and its interaction states — hover fill, keyboard focus ring, disabled — so
// every picker row behaves and focuses identically. Content stays children;
// per-list spacing tweaks ride `className` (twMerge lets them win).
export function OptionRow({
	selected,
	className,
	children,
	...props
}: {
	/** Tints the row (single-select radios); most lists show state via a checkbox. */
	selected?: boolean;
} & ComponentProps<"button">) {
	return (
		<button
			type="button"
			data-selected={selected || undefined}
			className={cn(
				"flex w-full items-center gap-3 px-3 py-2 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40 disabled:cursor-not-allowed data-[selected]:bg-primary/10",
				className,
			)}
			{...props}
		>
			{children}
		</button>
	);
}

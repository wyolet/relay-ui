import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// The one home for small icon-only affordances that aren't full Buttons:
// chip removers, dismiss/clear controls, disclosure glyphs. Anything with a
// text label, or that commits/creates, is a real <Button> instead.
//
// Two weights:
//   · "bare" — an inline glyph with no hit-box chrome, for ✕'s that sit inside
//     a chip or dense row (recolors on hover, no background).
//   · "soft" — a ghost square with a hover fill, for standalone icon actions.
// Both share one focus ring, hover, disabled, and aria contract so these stop
// being reinvented per feature.

type IconButtonWeight = "bare" | "soft";
type IconButtonSize = "xs" | "sm";

const WEIGHT: Record<IconButtonWeight, string> = {
	bare: "rounded-sm",
	soft: "rounded-md hover:bg-muted",
};

const SIZE: Record<IconButtonSize, { box: string; icon: string }> = {
	xs: { box: "size-5", icon: "size-3" },
	sm: { box: "size-6", icon: "size-3.5" },
};

export function IconButton({
	icon: Icon,
	label,
	weight = "soft",
	size = "sm",
	iconClassName,
	className,
	...props
}: {
	icon: LucideIcon;
	/** Accessible name — required; icon-only buttons have no text. */
	label: string;
	weight?: IconButtonWeight;
	size?: IconButtonSize;
	iconClassName?: string;
} & Omit<React.ComponentProps<"button">, "aria-label" | "children">) {
	return (
		<button
			type="button"
			aria-label={label}
			className={cn(
				"inline-flex shrink-0 items-center justify-center text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
				weight === "soft" && SIZE[size].box,
				WEIGHT[weight],
				className,
			)}
			{...props}
		>
			<Icon className={cn(SIZE[size].icon, iconClassName)} />
		</button>
	);
}

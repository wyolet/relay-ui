import { X } from "lucide-react";
import type { ReactNode } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

// The one tinted, rounded label chip — a value token with an optional dismiss.
// Replaces the per-feature chip forks (facet chips, selection refs, target
// models). Two tones and two shapes cover the real looks; the dismiss ✕ always
// goes through IconButton so the affordance stays identical everywhere.

type ChipTone = "neutral" | "primary";
type ChipShape = "pill" | "box";

const TONE: Record<ChipTone, string> = {
	neutral: "border border-border bg-muted/50 text-foreground",
	primary: "bg-primary/10 text-primary",
};

const SHAPE: Record<ChipShape, string> = {
	pill: "rounded-full",
	box: "rounded",
};

export function Chip({
	label,
	onRemove,
	tone = "neutral",
	shape = "pill",
	mono,
	labelClassName,
	className,
}: {
	label: ReactNode;
	/** When set, renders a trailing ✕ that calls this. */
	onRemove?: () => void;
	tone?: ChipTone;
	shape?: ChipShape;
	mono?: boolean;
	labelClassName?: string;
	className?: string;
}) {
	return (
		<span
			className={cn(
				"inline-flex h-6 items-center gap-1 pl-2 text-[11px]",
				onRemove ? "pr-0.5" : "pr-2",
				TONE[tone],
				SHAPE[shape],
				mono && "font-mono",
				className,
			)}
		>
			<span className={cn("truncate", labelClassName)}>{label}</span>
			{onRemove && (
				<IconButton
					icon={X}
					weight="bare"
					size="xs"
					label={typeof label === "string" ? `Remove ${label}` : "Remove"}
					onClick={onRemove}
					className={tone === "primary" ? "text-primary/70" : undefined}
				/>
			)}
		</span>
	);
}

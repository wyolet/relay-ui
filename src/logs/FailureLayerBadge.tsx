import { cn } from "@/lib/utils";
import type { FailureLayer } from "./attribution";

const TONE: Record<FailureLayer, string> = {
	relay: "bg-destructive/10 text-destructive",
	upstream: "bg-warning/10 text-warning",
	client: "bg-muted text-muted-foreground",
};

/** Compact "who failed" tag shown next to an error — relay, upstream, or
 * client — so a 401 row answers "us or them?" at a glance. */
export function FailureLayerBadge({
	layer,
	className,
}: {
	layer: FailureLayer;
	className?: string;
}) {
	return (
		<span
			className={cn(
				"rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide",
				TONE[layer],
				className,
			)}
		>
			{layer}
		</span>
	);
}

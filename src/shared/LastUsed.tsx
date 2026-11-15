import { fmtAgo, fmtTs } from "@/lib/format";
import { cn } from "@/lib/utils";

/** When a key or credential last served: "3h ago", the exact time on hover.
 * Relay omits the time when nothing was recorded (never used, or tracking
 * switched off), so that reads as a quiet dash rather than "Never". */
export function LastUsed({
	at,
	className,
}: {
	at?: string;
	className?: string;
}) {
	if (!at)
		return (
			<span className={cn("text-ink-3", className)} title="No request recorded">
				—
			</span>
		);
	return (
		<span className={cn("text-ink-2", className)} title={fmtTs(at)}>
			{fmtAgo(at)}
		</span>
	);
}

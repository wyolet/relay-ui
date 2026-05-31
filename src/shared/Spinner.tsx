import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Inline spinning indicator. Defaults to a 1rem muted glyph. */
export function Spinner({ className }: { className?: string }) {
	return (
		<Loader2
			className={cn("size-4 animate-spin text-muted-foreground", className)}
			aria-hidden="true"
		/>
	);
}

/**
 * Centered loader for a page/section that's blocked on a fetch — use as a
 * Suspense fallback or a route `pendingComponent`. `className` tunes the
 * occupied height (default keeps it from collapsing).
 */
export function PageLoader({
	className,
	label = "Loading",
}: {
	className?: string;
	label?: string;
}) {
	return (
		<output
			aria-live="polite"
			className={cn(
				"flex min-h-48 w-full items-center justify-center",
				className,
			)}
		>
			<Spinner className="size-6" />
			<span className="sr-only">{label}…</span>
		</output>
	);
}

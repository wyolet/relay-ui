import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Dashed placeholder for an empty tab or section: a title and a line of why. */
export function EmptyPanel({
	title,
	children,
	className,
}: {
	title: string;
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-center",
				className,
			)}
		>
			<div className="text-sm font-medium text-foreground">{title}</div>
			<div className="mt-0.5 text-xs text-muted-foreground">{children}</div>
		</div>
	);
}

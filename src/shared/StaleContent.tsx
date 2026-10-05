import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Dims results that are still showing the previous filter's data. */
export function StaleContent({
	stale,
	children,
}: {
	stale: boolean;
	children: ReactNode;
}) {
	return (
		<div
			aria-busy={stale}
			className={cn("transition-opacity", stale && "opacity-60")}
		>
			{children}
		</div>
	);
}

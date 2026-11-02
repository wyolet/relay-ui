import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Dashed box an index page shows in place of its table when no row is listed. */
export function TableEmpty({
	icon: Icon,
	children,
}: {
	icon?: LucideIcon;
	children: ReactNode;
}) {
	return (
		<div className="rounded-lg border border-dashed border-input bg-card px-6 py-14 text-center">
			{Icon && (
				<Icon className="w-6 h-6 mx-auto mb-3 text-muted-foreground/50" />
			)}
			{children}
		</div>
	);
}

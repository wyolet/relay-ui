import type { ReactNode } from "react";

/**
 * The one table header cell. Two visual treatments:
 *   - `cell` (default): compact detail-table header (`py-1.5`, plain weight).
 *   - `column`: index-table column header (uppercase, muted, `align`-aware).
 */
export function Th({
	children,
	className = "",
	align = "left",
	variant = "cell",
}: {
	children: ReactNode;
	className?: string;
	align?: "left" | "right";
	variant?: "cell" | "column";
}) {
	if (variant === "column") {
		return (
			<th
				scope="col"
				className={`px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground ${
					align === "right" ? "text-right" : "text-left"
				} ${className}`}
			>
				{children}
			</th>
		);
	}
	return (
		<th
			scope="col"
			className={`px-3 py-1.5 text-left font-medium ${className}`}
		>
			{children}
		</th>
	);
}

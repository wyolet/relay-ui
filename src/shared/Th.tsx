import { ArrowDown, ArrowUp } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Click-to-sort state for a `column` header. */
export interface SortState {
	active: boolean;
	direction: "asc" | "desc";
	onSort: () => void;
}

/**
 * The one table header cell. Two visual treatments:
 *   - `cell` (default): compact detail-table header (`py-1.5`, plain weight).
 *   - `column`: index-table column header (uppercase, muted, `align`-aware).
 *
 * Pass `sort` on a `column` header to make it a sort control — the arrow and
 * active/hover states come from here, so every sortable table matches.
 */
export function Th({
	children,
	className = "",
	align = "left",
	variant = "cell",
	sort,
}: {
	children: ReactNode;
	className?: string;
	align?: "left" | "right";
	variant?: "cell" | "column";
	sort?: SortState;
}) {
	if (variant === "column") {
		const Arrow = sort?.direction === "asc" ? ArrowUp : ArrowDown;
		return (
			<th
				scope="col"
				className={cn(
					"px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground",
					align === "right" ? "text-right" : "text-left",
					className,
				)}
			>
				{sort ? (
					<button
						type="button"
						onClick={sort.onSort}
						className={cn(
							"inline-flex items-center gap-1 transition-colors",
							align === "right" && "flex-row-reverse",
							sort.active ? "text-foreground" : "hover:text-foreground",
						)}
					>
						{children}
						{sort.active && <Arrow className="w-3 h-3" aria-hidden="true" />}
					</button>
				) : (
					children
				)}
			</th>
		);
	}
	return (
		<th
			scope="col"
			className={cn("px-3 py-1.5 text-left font-medium", className)}
		>
			{children}
		</th>
	);
}

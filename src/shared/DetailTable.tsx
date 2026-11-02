import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Th } from "@/shared/Th";

/** The bordered table a detail tab or section lists its rows in. */
export function DetailTable({
	columns,
	className,
	children,
}: {
	columns: { label: string; className?: string }[];
	className?: string;
	children: ReactNode;
}) {
	return (
		<div
			className={cn(
				"mt-2 rounded-md border border-border bg-card overflow-hidden",
				className,
			)}
		>
			<table className="w-full text-sm">
				<thead className="bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground">
					<tr>
						{columns.map((c) => (
							<Th key={c.label} className={c.className}>
								{c.label}
							</Th>
						))}
					</tr>
				</thead>
				<tbody className="divide-y divide-border">{children}</tbody>
			</table>
		</div>
	);
}

export function Td({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	return <td className={`px-3 py-2 align-middle ${className}`}>{children}</td>;
}

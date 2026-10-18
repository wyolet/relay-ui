import type { ReactNode } from "react";
import { type FigureData, FigureRow } from "@/shared/FigureRow";
import { Section } from "@/shared/Section";
import { StaleContent } from "@/shared/StaleContent";
import { useExplorer } from "./useExplorer";

/** Every lens has the same rhythm: figures, a chart, then the table. */
export function LensLayout({
	figures,
	chartTitle,
	chart,
	table,
}: {
	figures: FigureData[];
	chartTitle: string;
	chart: ReactNode;
	table: ReactNode;
}) {
	const { stale } = useExplorer();
	return (
		<StaleContent stale={stale}>
			<div className="grid gap-14">
				<FigureRow figures={figures} />
				<Section title={chartTitle}>{chart}</Section>
				<Section title="Breakdown">{table}</Section>
			</div>
		</StaleContent>
	);
}

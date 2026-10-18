import { FigureRow } from "@/shared/FigureRow";
import { Section } from "@/shared/Section";
import { useDashboardWindow } from "./useDashboardWindow";
import { useWeekFacts } from "./useWeekFacts";

export function WeekFacts() {
	const { period } = useDashboardWindow();
	return (
		<Section title="In numbers" meta={period}>
			<FigureRow figures={useWeekFacts()} size="mini" />
		</Section>
	);
}

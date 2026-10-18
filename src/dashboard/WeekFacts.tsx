import { FigureRow } from "@/shared/FigureRow";
import { Section } from "@/shared/Section";
import { useWeekFacts } from "./useWeekFacts";

export function WeekFacts() {
	return (
		<Section title="This week in numbers">
			<FigureRow figures={useWeekFacts()} size="mini" />
		</Section>
	);
}

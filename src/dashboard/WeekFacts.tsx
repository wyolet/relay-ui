import { Figure } from "@/shared/Figure";
import { Section } from "@/shared/Section";
import { useWeekFacts } from "./useWeekFacts";

export function WeekFacts() {
	return (
		<Section title="This week in numbers">
			<div className="grid grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-3 xl:grid-cols-6">
				{useWeekFacts().map((f) => (
					<Figure
						key={f.key}
						value={f.value}
						label={f.label}
						note={f.note}
						size="mini"
					/>
				))}
			</div>
		</Section>
	);
}

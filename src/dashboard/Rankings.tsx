import { Section } from "@/shared/Section";
import { TrackBars } from "@/shared/TrackBars";
import { useSpendRanking, useTopKeys } from "./useRankings";

export function SpendByModel() {
	return (
		<Section title="Spend by model" meta="this week">
			<TrackBars rows={useSpendRanking("model_id")} />
		</Section>
	);
}

export function SpendByTeam() {
	return (
		<Section title="Spend by team" meta="this week">
			<TrackBars rows={useSpendRanking("team_id")} />
		</Section>
	);
}

export function TopKeys() {
	return (
		<Section title="Top keys" meta="requests this week">
			<TrackBars rows={useTopKeys()} />
		</Section>
	);
}

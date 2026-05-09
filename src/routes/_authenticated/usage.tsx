import { createFileRoute } from "@tanstack/react-router";
import { SectionPlaceholder } from "@/components/SectionPlaceholder";

export const Route = createFileRoute("/_authenticated/usage")({
	component: UsagePage,
});

function UsagePage() {
	return (
		<SectionPlaceholder
			title="Usage"
			question="How much, how often, over time?"
			plannedFor="Charts and breakdowns by key, model, and time. Pending relay metrics endpoint."
		/>
	);
}

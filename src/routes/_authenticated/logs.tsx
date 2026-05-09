import { createFileRoute } from "@tanstack/react-router";
import { SectionPlaceholder } from "@/components/SectionPlaceholder";

export const Route = createFileRoute("/_authenticated/logs")({
	component: LogsPage,
});

function LogsPage() {
	return (
		<SectionPlaceholder
			title="Logs"
			question="What happened on this request?"
			plannedFor="Streaming request feed with filters and a per-request inspector. Pending relay request-log endpoint."
		/>
	);
}

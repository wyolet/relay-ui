import { createFileRoute } from "@tanstack/react-router";
import { SectionPlaceholder } from "#/components/SectionPlaceholder";

export const Route = createFileRoute("/_authenticated/routers")({
	component: RoutersPage,
});

function RoutersPage() {
	return (
		<SectionPlaceholder
			title="Routers"
			question="What routing strategies are configured?"
			plannedFor="YAML-defined and MCP-plugin routing strategies (auto/cheapest, auto/fastest, custom). Pending relay router-strategy endpoints."
		/>
	);
}

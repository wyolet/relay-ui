import { createFileRoute } from "@tanstack/react-router";
import { SectionPlaceholder } from "#/components/SectionPlaceholder";

export const Route = createFileRoute("/_authenticated/keys")({
	component: KeysPage,
});

function KeysPage() {
	return (
		<SectionPlaceholder
			title="Keys"
			question="Who is using what?"
			plannedFor="Relay API keys with per-key model allowlist, rate limit, quota, and usage. Pending relay key-management endpoints."
		/>
	);
}

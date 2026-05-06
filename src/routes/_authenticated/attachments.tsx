import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/attachments")({
	component: attachmentsPage,
});

function attachmentsPage() {
	return (
		<div>
			<h1 className="text-2xl font-bold text-gray-900 mb-4">attachments</h1>
			<p className="text-gray-500 text-sm">Coming soon.</p>
		</div>
	);
}

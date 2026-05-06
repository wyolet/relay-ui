import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/providers")({
	component: providersPage,
});

function providersPage() {
	return (
		<div>
			<h1 className="text-2xl font-bold text-gray-900 mb-4">providers</h1>
			<p className="text-gray-500 text-sm">Coming soon.</p>
		</div>
	);
}

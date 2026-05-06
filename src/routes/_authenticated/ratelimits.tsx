import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/ratelimits")({
	component: ratelimitsPage,
});

function ratelimitsPage() {
	return (
		<div>
			<h1 className="text-2xl font-bold text-gray-900 mb-4">ratelimits</h1>
			<p className="text-gray-500 text-sm">Coming soon.</p>
		</div>
	);
}

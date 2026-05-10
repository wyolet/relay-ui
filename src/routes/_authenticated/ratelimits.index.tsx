import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/ratelimits/")({
	beforeLoad: () => {
		throw redirect({ to: "/policies", search: { tab: "ratelimits" } });
	},
});

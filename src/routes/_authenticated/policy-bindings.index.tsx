import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/policy-bindings/")({
	beforeLoad: () => {
		throw redirect({ to: "/policies", search: { tab: "bindings" } });
	},
});

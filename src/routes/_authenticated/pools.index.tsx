import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/pools/")({
	beforeLoad: () => {
		throw redirect({ to: "/keys", search: { tab: "pools" } });
	},
});

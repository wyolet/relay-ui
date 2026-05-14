import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/host-keys/")({
	beforeLoad: () => {
		throw redirect({ to: "/keys", search: { tab: "provider" } });
	},
});

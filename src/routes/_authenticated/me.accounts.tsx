import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/me/accounts")({
	beforeLoad: () => {
		throw redirect({ to: "/keys", search: { tab: "accounts", mine: true } });
	},
});

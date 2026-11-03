import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/groups/")({
	beforeLoad: ({ search }) => {
		throw redirect({ to: "/users", search: { ...search, tab: "groups" } });
	},
});

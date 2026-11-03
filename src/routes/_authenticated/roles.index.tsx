import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/roles/")({
	beforeLoad: ({ search }) => {
		throw redirect({ to: "/users", search: { ...search, tab: "roles" } });
	},
});

import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/role-bindings/")({
	beforeLoad: ({ search }) => {
		throw redirect({
			to: "/users",
			search: { ...search, tab: "role-bindings" },
		});
	},
});

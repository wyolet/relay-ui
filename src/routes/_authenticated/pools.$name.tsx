import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/pools/$name")({
	beforeLoad: ({ params }) => {
		throw redirect({
			to: "/policies/$name",
			params: { name: params.name },
		});
	},
});

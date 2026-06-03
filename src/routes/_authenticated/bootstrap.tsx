import { createFileRoute, redirect } from "@tanstack/react-router";

// The old static bootstrap page is superseded by the guided wizard at /setup.
export const Route = createFileRoute("/_authenticated/bootstrap")({
	beforeLoad() {
		throw redirect({ to: "/setup" });
	},
});

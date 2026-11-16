import { createFileRoute, redirect } from "@tanstack/react-router";

// The permission switches live in the Governance section now.
export const Route = createFileRoute("/_authenticated/settings/permissions")({
	beforeLoad: () => {
		throw redirect({
			to: "/settings/$section",
			params: { section: "governance" },
		});
	},
});

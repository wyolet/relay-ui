import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { useAuth } from "@/api/auth";
import { authSCIMQueryOptions, useAuthSCIM } from "@/api/hooks/settings";
import { ScimSettingsForm } from "@/scim/ScimSettingsForm";
import { NoAccessState } from "@/shared/RouteError";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/settings/scim")({
	// A refused read must not reach the route error boundary: the page shows
	// non-admins a no-access state, and an admin's error rethrows from the query.
	loader: ({ context }) =>
		context.queryClient
			.ensureQueryData(authSCIMQueryOptions)
			.catch(() => undefined),
	component: ScimSettingsPage,
});

function ScimSettingsEditor() {
	const { data } = useAuthSCIM();
	return <ScimSettingsForm envelope={data} />;
}

function ScimSettingsReadOnly() {
	const { data, isPending } = useQuery(authSCIMQueryOptions);
	if (isPending) return <PageLoader />;
	if (!data) {
		return (
			<NoAccessState
				title="Only admins can view SCIM settings"
				description="Ask an admin to review or change provisioning."
			/>
		);
	}
	return <ScimSettingsForm envelope={data} readOnly />;
}

// Writing auth:scim takes an admin: it decides whether an identity provider may
// create accounts and whether its deletes remove them.
function ScimSettingsPage() {
	const { isAdmin } = useAuth();
	return (
		<Suspense fallback={<PageLoader />}>
			{isAdmin ? <ScimSettingsEditor /> : <ScimSettingsReadOnly />}
		</Suspense>
	);
}

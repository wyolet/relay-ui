import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { useAuth, whoamiQueryOptions } from "@/api/auth";
import { scimClientsQueryOptions } from "@/api/hooks/scimClients";
import { authSCIMQueryOptions } from "@/api/hooks/settings";
import { ScimClientsView } from "@/scim/ScimClientsView";
import { NoAccessState } from "@/shared/RouteError";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/scim-clients")({
	// Only an admin may list clients, so a non-admin skips reads that would be
	// refused; the page shows them a no-access state.
	loader: async ({ context }) => {
		const { queryClient } = context;
		const whoami = await queryClient.ensureQueryData(whoamiQueryOptions);
		if (!whoami.roles.includes("admin")) return;
		await Promise.all([
			queryClient.ensureQueryData(scimClientsQueryOptions),
			queryClient.ensureQueryData(authSCIMQueryOptions),
		]);
	},
	component: ScimClientsPage,
});

// Managing SCIM clients takes an admin in every authz mode: a token creates
// accounts and decides who is in the groups that bindings name.
function ScimClientsPage() {
	const { isAdmin } = useAuth();
	return (
		<div>
			<div className="mb-4">
				<h1 className="text-lg font-semibold text-foreground">SCIM clients</h1>
				<p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">
					Identity providers such as Microsoft Entra ID or Okta that create,
					update and deactivate users and groups through SCIM 2.0. Each client
					acts only on what it provisioned; what a provisioned group may do is
					decided by the role bindings on it.
				</p>
			</div>
			{isAdmin ? (
				<Suspense fallback={<PageLoader className="min-h-[40vh]" />}>
					<ScimClientsView />
				</Suspense>
			) : (
				<NoAccessState
					title="Only admins can manage SCIM clients"
					description="Ask an admin to connect an identity provider."
				/>
			)}
		</div>
	);
}

import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { licenseQueryOptions } from "@/api/hooks/license";
import {
	roleDetailQueryOptions,
	roleReferencesQueryOptions,
} from "@/api/hooks/roles";
import { RoleDetailView } from "@/roles/RoleDetailView";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/roles/$name")({
	loader: async ({ context, params }) => {
		const { queryClient } = context;
		void queryClient.prefetchQuery(licenseQueryOptions);
		const role = await queryClient.ensureQueryData(
			roleDetailQueryOptions(params.name),
		);
		return queryClient.ensureQueryData(
			roleReferencesQueryOptions(role.metadata.id ?? ""),
		);
	},
	component: RoleDetailPage,
});

function RoleDetailPage() {
	const { name } = Route.useParams();
	return (
		<Suspense fallback={<PageLoader />}>
			<RoleDetailView name={name} />
		</Suspense>
	);
}

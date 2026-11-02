import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { AccountDetailView } from "@/accounts/AccountDetailView";
import {
	accountDetailQueryOptions,
	accountKeysQueryOptions,
} from "@/api/hooks/accounts";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/accounts/$name")({
	loader: ({ context, params }) => {
		const { queryClient } = context;
		void queryClient.prefetchQuery(accountKeysQueryOptions(params.name));
		void queryClient.prefetchQuery(hostsListQueryOptions);
		return queryClient.ensureQueryData(accountDetailQueryOptions(params.name));
	},
	component: AccountDetailPage,
});

function AccountDetailPage() {
	const { name } = Route.useParams();
	return (
		<Suspense fallback={<PageLoader />}>
			<AccountDetailView name={name} />
		</Suspense>
	);
}

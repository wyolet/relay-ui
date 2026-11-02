import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { AccountDetailView } from "@/accounts/AccountDetailView";
import { PROVIDER_KIND } from "@/accounts/accountView";
import { accountDetailQueryOptions } from "@/api/hooks/accounts";
import { accountHostKeysQuery } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { policyBindingsAllQueryOptions } from "@/api/hooks/policyBindings";
import { serviceAccountsListQueryOptions } from "@/api/hooks/serviceAccounts";
import { usersListQueryOptions } from "@/api/hooks/users";
import { AccountKeysCard } from "@/host-keys/AccountKeysCard";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/accounts/$name")({
	loader: async ({ context, params }) => {
		const { queryClient } = context;
		void queryClient.prefetchQuery(hostsListQueryOptions);
		void queryClient.prefetchQuery(policyBindingsAllQueryOptions);
		void queryClient.prefetchQuery(policiesListQueryOptions);
		void queryClient.prefetchQuery(usersListQueryOptions);
		void queryClient.prefetchQuery(serviceAccountsListQueryOptions);
		const account = await queryClient.ensureQueryData(
			accountDetailQueryOptions(params.name),
		);
		if (account.spec.kind === PROVIDER_KIND && account.metadata.id) {
			void queryClient.prefetchQuery(accountHostKeysQuery(account.metadata.id));
		}
		return account;
	},
	component: AccountDetailPage,
});

function AccountDetailPage() {
	const { name } = Route.useParams();
	return (
		<Suspense fallback={<PageLoader />}>
			<AccountDetailView
				name={name}
				keysCard={
					<Suspense fallback={<PageLoader className="min-h-24" />}>
						<AccountKeysCard accountName={name} />
					</Suspense>
				}
			/>
		</Suspense>
	);
}

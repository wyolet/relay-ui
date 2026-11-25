import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { AccountForm } from "@/accounts/AccountForm";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { BackLink } from "@/shared/BackLink";
import { PageHeader } from "@/shared/PageHeader";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/accounts/new")({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(hostsListQueryOptions),
	component: NewAccountPage,
});

function NewAccountPage() {
	const navigate = useNavigate();
	return (
		<div>
			<PageHeader
				back={
					<BackLink to="/keys" search={{ tab: "accounts" }}>
						Accounts
					</BackLink>
				}
				title="New provider account"
				description="An organization at a provider. Its keys share the provider's limits, and a policy bound to the account caps them."
			/>
			<Suspense fallback={<PageLoader />}>
				<AccountForm
					onSaved={(name) =>
						void navigate({ to: "/accounts/$name", params: { name } })
					}
					onCancel={() =>
						void navigate({ to: "/keys", search: { tab: "accounts" } })
					}
				/>
			</Suspense>
		</div>
	);
}

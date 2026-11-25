import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import {
	type Account,
	accountDetailQueryOptions,
	useAccount,
} from "@/api/hooks/accounts";
import { HostKeyForm } from "@/host-keys/HostKeyForm";
import { displayLabel } from "@/lib/displayLabel";
import { BackLink } from "@/shared/BackLink";
import { PageHeader } from "@/shared/PageHeader";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/host-keys/new")({
	// Opened from an account's keys card: the key joins that account.
	validateSearch: z.object({ accountId: z.string().optional() }),
	loaderDeps: ({ search }) => ({ accountId: search.accountId }),
	loader: ({ context, deps }) =>
		deps.accountId
			? context.queryClient.ensureQueryData(
					accountDetailQueryOptions(deps.accountId),
				)
			: null,
	component: NewHostKeyPage,
});

function NewHostKeyInner({ account }: { account?: Account }) {
	const navigate = useNavigate();
	const back = () =>
		void (account
			? navigate({
					to: "/accounts/$name",
					params: { name: account.metadata.name },
				})
			: navigate({ to: "/keys", search: { tab: "accounts" } }));
	return (
		<div>
			<PageHeader
				back={
					account ? (
						<BackLink
							to="/accounts/$name"
							params={{ name: account.metadata.name }}
						>
							{displayLabel(account.metadata)}
						</BackLink>
					) : (
						<BackLink to="/keys" search={{ tab: "accounts" }}>
							Accounts
						</BackLink>
					)
				}
				title="New key"
				description="Register an upstream credential — stored encrypted by Relay, or sourced from an environment variable on your deployment."
			/>
			<HostKeyForm
				account={account}
				onSaved={(name) =>
					account
						? back()
						: void navigate({ to: "/host-keys/$name", params: { name } })
				}
				onCancel={back}
			/>
		</div>
	);
}

function PresetAccountInner({ accountId }: { accountId: string }) {
	const { data: account } = useAccount(accountId);
	return <NewHostKeyInner account={account} />;
}

function NewHostKeyPage() {
	const { accountId } = Route.useSearch();
	return (
		<Suspense fallback={<PageLoader />}>
			{accountId ? (
				<PresetAccountInner accountId={accountId} />
			) : (
				<NewHostKeyInner />
			)}
		</Suspense>
	);
}

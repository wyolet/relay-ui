import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { AccountForm } from "@/accounts/AccountForm";
import { accountDetailQueryOptions, useAccount } from "@/api/hooks/accounts";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { displayLabel } from "@/lib/displayLabel";
import { BackLink } from "@/shared/BackLink";
import { PageHeader } from "@/shared/PageHeader";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/accounts/$name_/edit")({
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(
				accountDetailQueryOptions(params.name),
			),
			context.queryClient.ensureQueryData(hostsListQueryOptions),
		]),
	component: EditAccountPage,
});

function EditAccountInner() {
	const { name } = Route.useParams();
	const { data: account } = useAccount(name);
	const navigate = useNavigate();
	const back = () => void navigate({ to: "/accounts/$name", params: { name } });

	return (
		<div>
			<PageHeader
				back={
					<BackLink to="/accounts/$name" params={{ name }}>
						{displayLabel(account.metadata)}
					</BackLink>
				}
				title="Edit account"
				description="Change its name, organization id or labels. The slug and host stay the same."
			/>
			<AccountForm
				account={account}
				onSaved={(savedName) =>
					void navigate({ to: "/accounts/$name", params: { name: savedName } })
				}
				onCancel={back}
			/>
		</div>
	);
}

function EditAccountPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<EditAccountInner />
		</Suspense>
	);
}

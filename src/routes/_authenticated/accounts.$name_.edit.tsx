import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { AccountForm } from "@/accounts/AccountForm";
import { accountDetailQueryOptions, useAccount } from "@/api/hooks/accounts";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { displayLabel } from "@/lib/displayLabel";
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
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/accounts/$name"
					params={{ name }}
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					{displayLabel(account.metadata)}
				</Link>
				<h1 className="mt-2 text-xl font-semibold text-foreground">
					Edit account
				</h1>
			</div>
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

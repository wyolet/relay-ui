import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { z } from "zod";
import {
	type Account,
	accountDetailQueryOptions,
	useAccount,
} from "@/api/hooks/accounts";
import { HostKeyForm } from "@/host-keys/HostKeyForm";
import { displayLabel } from "@/lib/displayLabel";
import { PageLoader } from "@/shared/Spinner";

const backLinkClass =
	"inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors";

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
		<div className="flex flex-col gap-4">
			<div>
				{account ? (
					<Link
						to="/accounts/$name"
						params={{ name: account.metadata.name }}
						className={backLinkClass}
					>
						<ChevronLeft className="w-3.5 h-3.5" />
						{displayLabel(account.metadata)}
					</Link>
				) : (
					<Link
						to="/keys"
						search={{ tab: "accounts" }}
						className={backLinkClass}
					>
						<ChevronLeft className="w-3.5 h-3.5" />
						Accounts
					</Link>
				)}
				<h1 className="mt-2 text-xl font-semibold text-foreground">New key</h1>
				<p className="mt-1 text-xs text-muted-foreground">
					Register an upstream credential — stored encrypted by Relay, or
					sourced from an environment variable on your deployment.
				</p>
			</div>
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

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { AccountForm } from "@/accounts/AccountForm";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/accounts/new")({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(hostsListQueryOptions),
	component: NewAccountPage,
});

function NewAccountPage() {
	const navigate = useNavigate();
	return (
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/keys"
					search={{ tab: "accounts" }}
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					Accounts
				</Link>
				<h1 className="mt-2 text-xl font-semibold text-foreground">
					New account
				</h1>
			</div>
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

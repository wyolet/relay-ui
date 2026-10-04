import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import { ServiceAccountForm } from "@/service-accounts/ServiceAccountForm";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/service-accounts/new")({
	loader: ({ context }) =>
		Promise.all([
			context.queryClient.ensureQueryData(projectsListQueryOptions),
			context.queryClient.ensureQueryData(policiesListQueryOptions),
		]),
	component: NewServiceAccountPage,
});

function NewServiceAccountInner() {
	const navigate = useNavigate();
	return (
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/service-accounts"
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					Service accounts
				</Link>
				<h1 className="mt-2 text-xl font-semibold text-foreground">
					New service account
				</h1>
				<p className="mt-1 text-xs text-muted-foreground">
					Keys are issued to an account, so rotating a secret leaves everything
					bound to the account untouched.
				</p>
			</div>
			<ServiceAccountForm
				onSaved={(name) =>
					void navigate({ to: "/service-accounts/$name", params: { name } })
				}
				onCancel={() => void navigate({ to: "/service-accounts" })}
			/>
		</div>
	);
}

function NewServiceAccountPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<NewServiceAccountInner />
		</Suspense>
	);
}

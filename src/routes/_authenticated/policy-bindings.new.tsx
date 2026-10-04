import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { z } from "zod";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import { PolicyBindingForm } from "@/policy-bindings/PolicyBindingForm";
import { PageLoader } from "@/shared/Spinner";

const searchSchema = z.object({
	project_id: z.string().catch("").default(""),
});

export const Route = createFileRoute("/_authenticated/policy-bindings/new")({
	validateSearch: searchSchema,
	loader: ({ context }) =>
		Promise.all([
			context.queryClient.ensureQueryData(projectsListQueryOptions),
			context.queryClient.ensureQueryData(policiesListQueryOptions),
		]),
	component: NewPolicyBindingPage,
});

function NewPolicyBindingInner() {
	const { project_id } = Route.useSearch();
	const navigate = useNavigate();
	return (
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/policy-bindings"
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					Policy bindings
				</Link>
				<h1 className="mt-2 text-xl font-semibold text-foreground">
					New policy binding
				</h1>
				<p className="mt-1 text-xs text-muted-foreground">
					A key's own policy, then its service account's, then this binding —
					first one set wins.
				</p>
			</div>
			<PolicyBindingForm
				projectId={project_id}
				onSaved={(name) =>
					void navigate({ to: "/policy-bindings/$name", params: { name } })
				}
				onCancel={() => void navigate({ to: "/policy-bindings" })}
			/>
		</div>
	);
}

function NewPolicyBindingPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<NewPolicyBindingInner />
		</Suspense>
	);
}

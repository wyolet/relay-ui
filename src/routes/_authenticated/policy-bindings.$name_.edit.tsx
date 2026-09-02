import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import {
	policyBindingDetailQueryOptions,
	usePolicyBinding,
} from "@/api/hooks/policyBindings";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import { displayLabel } from "@/lib/displayLabel";
import { PolicyBindingForm } from "@/policy-bindings/PolicyBindingForm";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute(
	"/_authenticated/policy-bindings/$name_/edit",
)({
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(
				policyBindingDetailQueryOptions(params.name),
			),
			context.queryClient.ensureQueryData(projectsListQueryOptions),
			context.queryClient.ensureQueryData(policiesListQueryOptions),
		]),
	component: EditPolicyBindingPage,
});

function EditPolicyBindingInner() {
	const { name } = Route.useParams();
	const { data: binding } = usePolicyBinding(name);
	const navigate = useNavigate();

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/policy-bindings/$name"
					params={{ name }}
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					{displayLabel(binding.metadata)}
				</Link>
				<h1 className="mt-2 text-xl font-semibold text-foreground">
					Edit policy binding
				</h1>
			</div>
			<PolicyBindingForm
				binding={binding}
				onSaved={(savedName) =>
					void navigate({
						to: "/policy-bindings/$name",
						params: { name: savedName },
					})
				}
				onCancel={() =>
					void navigate({ to: "/policy-bindings/$name", params: { name } })
				}
			/>
		</div>
	);
}

function EditPolicyBindingPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<EditPolicyBindingInner />
		</Suspense>
	);
}

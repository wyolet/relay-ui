import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { bindingsListQueryOptions } from "@/api/hooks/bindings";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { pricingDetailQueryOptions, usePricing } from "@/api/hooks/pricings";
import { displayLabel } from "@/lib/displayLabel";
import { PricingForm } from "@/pricing/PricingForm";
import { BackLink } from "@/shared/BackLink";
import { PageHeader } from "@/shared/PageHeader";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/pricing/$name_/edit")({
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(
				pricingDetailQueryOptions(params.name),
			),
			context.queryClient.ensureQueryData(modelsListQueryOptions),
			context.queryClient.ensureQueryData(hostsListQueryOptions),
			context.queryClient.ensureQueryData(bindingsListQueryOptions),
		]),
	component: EditPricingPage,
});

function EditPricingInner() {
	const { name } = Route.useParams();
	const { data: pricing } = usePricing(name);
	const navigate = useNavigate();

	return (
		<div>
			<PageHeader
				back={
					<BackLink to="/pricing/$name" params={{ name }}>
						{displayLabel(pricing.metadata)}
					</BackLink>
				}
				title="Edit pricing"
				description="Rates apply from the next request — historical estimates recompute against the new card."
			/>
			<PricingForm
				pricing={pricing}
				onSaved={(savedName) =>
					void navigate({ to: "/pricing/$name", params: { name: savedName } })
				}
				onCancel={() =>
					void navigate({ to: "/pricing/$name", params: { name } })
				}
			/>
		</div>
	);
}

function EditPricingPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<EditPricingInner />
		</Suspense>
	);
}

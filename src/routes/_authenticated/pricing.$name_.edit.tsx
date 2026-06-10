import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { pricingDetailQueryOptions, usePricing } from "@/api/hooks/pricings";
import { displayLabel } from "@/lib/displayLabel";
import { PricingForm } from "@/pricing/PricingForm";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/pricing/$name_/edit")({
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(
				pricingDetailQueryOptions(params.name),
			),
			context.queryClient.ensureQueryData(modelsListQueryOptions),
			context.queryClient.ensureQueryData(hostsListQueryOptions),
		]),
	component: EditPricingPage,
});

function EditPricingInner() {
	const { name } = Route.useParams();
	const { data: pricing } = usePricing(name);
	const navigate = useNavigate();

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/pricing/$name"
					params={{ name }}
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					{displayLabel(pricing.metadata)}
				</Link>
				<h1 className="mt-2 text-xl font-semibold text-foreground">
					Edit pricing
				</h1>
				<p className="mt-1 text-xs text-muted-foreground">
					Rates apply from the next request — historical estimates recompute
					against the new card.
				</p>
			</div>
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

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { modelsListQueryOptions } from "@/api/hooks/models";
import {
	pricingDetailQueryOptions,
	useDeletePricing,
	usePricing,
	useUpdatePricing,
} from "@/api/hooks/pricings";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { displayLabel } from "@/lib/displayLabel";
import { PricingDetailView } from "@/pricing/PricingDetailView";
import { pricingGraphQuery } from "@/pricing/usePricingMatrix";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { PageLoader } from "@/shared/Spinner";
import { toast } from "@/shared/Toast";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";

export const Route = createFileRoute("/_authenticated/pricing/$name")({
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(
				pricingDetailQueryOptions(params.name),
			),
			context.queryClient.ensureQueryData(modelsListQueryOptions),
			context.queryClient.ensureQueryData(hostsListQueryOptions),
			context.queryClient.ensureQueryData(pricingGraphQuery),
		]),
	component: PricingDetailPage,
});

function PricingDetailInner() {
	const { name } = Route.useParams();
	const navigate = useNavigate({ from: "/pricing/$name" });
	const { data: pricing } = usePricing(name);
	const del = useConfirmedDelete(useDeletePricing(), {
		noun: "pricing",
		onDeleted: () => void navigate({ to: "/pricing" }),
	});
	const updatePricing = useUpdatePricing();
	const toastSaveError = useSaveErrorToast();

	async function handleToggleEnabled() {
		const next = !(pricing.spec.enabled !== false);
		try {
			await updatePricing.mutateAsync({
				id: pricing.metadata.id ?? "",
				body: { ...pricing, spec: { ...pricing.spec, enabled: next } },
			});
			toast("success", next ? "Pricing enabled." : "Pricing disabled.");
		} catch (err) {
			toastSaveError(err, "Failed to toggle pricing.");
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<Link
				to="/pricing"
				className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
			>
				<ChevronLeft className="w-3.5 h-3.5" />
				Pricing
			</Link>
			<PricingDetailView
				pricing={pricing}
				onDelete={() =>
					del.request({
						id: pricing.metadata.id ?? "",
						name: pricing.metadata.name,
						label: displayLabel(pricing.metadata),
					})
				}
				onToggleEnabled={() => void handleToggleEnabled()}
				deleting={del.isPending}
				toggling={updatePricing.isPending}
			/>
			{del.target && (
				<DeleteConfirm
					resourceName={del.target.name}
					onConfirm={() => void del.confirm()}
					onCancel={del.cancel}
					isPending={del.isPending}
					error={del.error}
				/>
			)}
		</div>
	);
}

function PricingDetailPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<PricingDetailInner />
		</Suspense>
	);
}

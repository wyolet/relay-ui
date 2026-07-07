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
import { ApiError } from "@/api/types/errors";
import { displayLabel } from "@/lib/displayLabel";
import { PricingDetailView } from "@/pricing/PricingDetailView";
import { confirm } from "@/shared/ConfirmDialog";
import { PageLoader } from "@/shared/Spinner";
import { toast } from "@/shared/Toast";

export const Route = createFileRoute("/_authenticated/pricing/$name")({
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(
				pricingDetailQueryOptions(params.name),
			),
			context.queryClient.ensureQueryData(modelsListQueryOptions),
			context.queryClient.ensureQueryData(hostsListQueryOptions),
		]),
	component: PricingDetailPage,
});

function PricingDetailInner() {
	const { name } = Route.useParams();
	const navigate = useNavigate({ from: "/pricing/$name" });
	const { data: pricing } = usePricing(name);
	const deletePricing = useDeletePricing();
	const updatePricing = useUpdatePricing();

	async function handleDelete() {
		const ok = await confirm({
			title: `Delete pricing ${name}?`,
			description:
				"Bindings that reference it lose their rates — affected usage shows as unpriced.",
			confirmLabel: "Delete",
			danger: true,
		});
		if (!ok) return;
		try {
			await deletePricing.mutateAsync(pricing.metadata.id ?? "");
			toast("success", `Pricing "${displayLabel(pricing.metadata)}" deleted.`);
			void navigate({ to: "/pricing" });
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError
					? err.body.message
					: "Failed to delete pricing.",
			);
		}
	}

	async function handleToggleEnabled() {
		const next = !(pricing.spec.enabled !== false);
		try {
			await updatePricing.mutateAsync({
				id: pricing.metadata.id ?? "",
				body: { ...pricing, spec: { ...pricing.spec, enabled: next } },
			});
			toast("success", next ? "Pricing enabled." : "Pricing disabled.");
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError
					? err.body.message
					: "Failed to toggle pricing.",
			);
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
				onDelete={() => void handleDelete()}
				onToggleEnabled={() => void handleToggleEnabled()}
				deleting={deletePricing.isPending}
				toggling={updatePricing.isPending}
			/>
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

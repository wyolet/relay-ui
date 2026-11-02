import { DollarSign } from "lucide-react";
import { Suspense } from "react";
import type { ModelHostView } from "@/api/hooks/models";
import type { Host } from "@/api/types/host";
import type { Model } from "@/api/types/model";
import { HostPricingCard } from "@/models/HostPricingCard";
import { useModelPricing } from "@/models/useModelPricing";
import { EmptyState } from "@/shared/EmptyState";

export function ModelPricingTab({
	model,
	hostRows,
	hostById,
}: {
	model: Model;
	hostRows: ModelHostView[];
	hostById: Map<string, Host>;
}) {
	if (!model.metadata.id) {
		return (
			<EmptyState
				icon={DollarSign}
				title="Pricing"
				body="Save this model to attach and view its pricing."
				comingSoon
			/>
		);
	}
	return (
		<Suspense fallback={<PricingSkeleton />}>
			<ModelPricing
				modelId={model.metadata.id}
				hostRows={hostRows}
				hostById={hostById}
			/>
		</Suspense>
	);
}

/** One card per host binding: its rates, billing context and spend. */
function ModelPricing({
	modelId,
	hostRows,
	hostById,
}: {
	modelId: string;
	hostRows: ModelHostView[];
	hostById: Map<string, Host>;
}) {
	const { hosts, windowText } = useModelPricing(modelId, hostRows, hostById);

	if (hosts.length === 0) {
		return (
			<EmptyState
				icon={DollarSign}
				title="No pricing configured"
				body="This model isn't bound to a host yet. Pricing appears per host once a binding is in place."
			/>
		);
	}

	return (
		<div className="mt-2 flex flex-col gap-4">
			{hosts.map((h) => (
				<HostPricingCard
					key={h.row.binding.id}
					pricing={h}
					windowText={windowText}
				/>
			))}
		</div>
	);
}

function PricingSkeleton() {
	return (
		<div className="mt-4 rounded-md border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
			Loading pricing…
		</div>
	);
}

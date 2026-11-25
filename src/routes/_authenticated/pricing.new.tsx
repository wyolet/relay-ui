import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { bindingsListQueryOptions } from "@/api/hooks/bindings";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { PricingForm } from "@/pricing/PricingForm";
import { BackLink } from "@/shared/BackLink";
import { PageHeader } from "@/shared/PageHeader";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/_authenticated/pricing/new")({
	// Prefill from an unpriced row on the index: its host and model.
	validateSearch: z.object({
		host: z.string().optional(),
		model: z.string().optional(),
	}),
	loader: ({ context }) =>
		Promise.all([
			context.queryClient.ensureQueryData(modelsListQueryOptions),
			context.queryClient.ensureQueryData(hostsListQueryOptions),
			context.queryClient.ensureQueryData(bindingsListQueryOptions),
		]),
	component: NewPricingPage,
});

function NewPricingInner() {
	const navigate = useNavigate();
	const { host, model } = Route.useSearch();
	return (
		<div>
			<PageHeader
				back={<BackLink to="/pricing">Pricing</BackLink>}
				title="New pricing"
				description="Define per-meter rates in a currency. Attach it to host bindings to power spend estimates."
			/>
			<PricingForm
				prefill={{ host, targetModels: model ? [model] : undefined }}
				onSaved={(name) =>
					void navigate({ to: "/pricing/$name", params: { name } })
				}
				onCancel={() => void navigate({ to: "/pricing" })}
			/>
		</div>
	);
}

function NewPricingPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<NewPricingInner />
		</Suspense>
	);
}

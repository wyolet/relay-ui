import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { z } from "zod";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { PricingForm } from "@/pricing/PricingForm";
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
		]),
	component: NewPricingPage,
});

function NewPricingInner() {
	const navigate = useNavigate();
	const { host, model } = Route.useSearch();
	return (
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/pricing"
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					Pricing
				</Link>
				<h1 className="mt-2 text-xl font-semibold text-foreground">
					New pricing
				</h1>
				<p className="mt-1 text-xs text-muted-foreground">
					Define per-meter rates in a currency. Attach it to host bindings to
					power spend estimates.
				</p>
			</div>
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

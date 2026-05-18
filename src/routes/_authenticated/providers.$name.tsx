import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { z } from "zod";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import {
	providerDetailQueryOptions,
	providersListQueryOptions,
	useProvider,
	useUpdateProvider,
} from "@/api/hooks/providers";
import { rateLimitsListQueryOptions } from "@/api/hooks/ratelimits";
import { relayKeysListQueryOptions } from "@/api/hooks/relayKeys";
import { ApiError } from "@/api/types/errors";
import {
	type ProviderDetailTab,
	ProviderDetailView,
} from "@/providers/ProviderDetailView";
import { toast } from "@/shared/Toast";

const searchSchema = z.object({
	tab: z
		.enum(["overview", "models", "hosts"])
		.optional()
		.default("overview"),
});

export const Route = createFileRoute("/_authenticated/providers/$name")({
	validateSearch: searchSchema,
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(
				providerDetailQueryOptions(params.name),
			),
			context.queryClient.ensureQueryData(providersListQueryOptions),
			context.queryClient.ensureQueryData(modelsListQueryOptions),
			context.queryClient.ensureQueryData(hostsListQueryOptions),
			context.queryClient.ensureQueryData(hostKeysListQueryOptions),
			context.queryClient.ensureQueryData(policiesListQueryOptions),
			context.queryClient.ensureQueryData(rateLimitsListQueryOptions),
			context.queryClient.ensureQueryData(relayKeysListQueryOptions),
		]),
	component: ProviderDetailPage,
});

function ProviderDetailInner() {
	const { name } = Route.useParams();
	const { tab } = Route.useSearch();
	const navigate = useNavigate({ from: "/providers/$name" });
	const { data: provider } = useProvider(name);
	const updateProvider = useUpdateProvider(provider.metadata.id ?? "");

	async function handleToggleEnabled() {
		const next = !(provider.spec.enabled !== false);
		try {
			await updateProvider.mutateAsync({
				metadata: provider.metadata,
				spec: { ...provider.spec, enabled: next },
			});
			toast("success", next ? "Provider enabled." : "Provider disabled.");
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError
					? err.body.message
					: "Failed to toggle provider.",
			);
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<Link
				to="/models"
				className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
			>
				<ChevronLeft className="w-3.5 h-3.5" />
				Models
			</Link>
			<ProviderDetailView
				provider={provider}
				tab={tab}
				onTabChange={(next: ProviderDetailTab) =>
					void navigate({ search: (prev) => ({ ...prev, tab: next }) })
				}
				onToggleEnabled={() => void handleToggleEnabled()}
				toggling={updateProvider.isPending}
			/>
		</div>
	);
}

function ProviderDetailPage() {
	return (
		<Suspense
			fallback={<div className="text-muted-foreground text-sm">Loading…</div>}
		>
			<ProviderDetailInner />
		</Suspense>
	);
}

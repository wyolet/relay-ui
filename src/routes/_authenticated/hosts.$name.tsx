import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { z } from "zod";
import { governanceQueryOptions } from "@/api/hooks/governance";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import {
	hostDetailQueryOptions,
	hostsListQueryOptions,
	useDeleteHost,
	useHost,
	useUpdateHost,
} from "@/api/hooks/hosts";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { providersListQueryOptions } from "@/api/hooks/providers";
import { rateLimitsListQueryOptions } from "@/api/hooks/ratelimits";
import { relayKeysListQueryOptions } from "@/api/hooks/relayKeys";
import { ApiError } from "@/api/types/errors";
import { type HostDetailTab, HostDetailView } from "@/hosts/HostDetailView";
import { displayLabel } from "@/lib/displayLabel";
import { confirm } from "@/shared/ConfirmDialog";
import { PageLoader } from "@/shared/Spinner";
import { toast } from "@/shared/Toast";

const searchSchema = z.object({
	tab: z
		.enum([
			"overview",
			"configuration",
			"host-policies",
			"user-policies",
			"host-keys",
			"models",
			"usage",
			"logs",
		])
		.optional()
		.default("overview"),
});

export const Route = createFileRoute("/_authenticated/hosts/$name")({
	validateSearch: searchSchema,
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(hostDetailQueryOptions(params.name)),
			context.queryClient.ensureQueryData(hostsListQueryOptions),
			context.queryClient.ensureQueryData(hostKeysListQueryOptions),
			context.queryClient.ensureQueryData(policiesListQueryOptions),
			context.queryClient.ensureQueryData(modelsListQueryOptions),
			context.queryClient.ensureQueryData(rateLimitsListQueryOptions),
			context.queryClient.ensureQueryData(relayKeysListQueryOptions),
			context.queryClient.ensureQueryData(providersListQueryOptions),
			context.queryClient.ensureQueryData(governanceQueryOptions("host")),
		]),
	component: HostDetailPage,
});

function HostDetailInner() {
	const { name } = Route.useParams();
	const { tab } = Route.useSearch();
	const navigate = useNavigate({ from: "/hosts/$name" });
	const { data: host } = useHost(name);
	const updateHost = useUpdateHost(host.metadata.id ?? "");
	const deleteHost = useDeleteHost();

	async function handleDelete() {
		const ok = await confirm({
			title: `Delete host ${name}?`,
			description:
				"Models and keys bound to this host will lose access until reattached.",
			confirmLabel: "Delete",
			danger: true,
		});
		if (!ok) return;
		try {
			await deleteHost.mutateAsync(host.metadata.id ?? "");
			toast("success", `Host "${displayLabel(host.metadata)}" deleted.`);
			void navigate({ to: "/models", search: { tab: "hosts" } });
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError ? err.body.message : "Failed to delete host.",
			);
		}
	}

	async function handleToggleEnabled() {
		const next = !(host.spec.enabled !== false);
		try {
			await updateHost.mutateAsync({
				metadata: host.metadata,
				spec: { ...host.spec, enabled: next },
			});
			toast("success", next ? "Host enabled." : "Host disabled.");
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError ? err.body.message : "Failed to toggle host.",
			);
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<Link
				to="/models"
				search={(prev) => ({ ...prev, tab: "hosts" as const })}
				className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
			>
				<ChevronLeft className="w-3.5 h-3.5" />
				Hosts
			</Link>
			<HostDetailView
				host={host}
				tab={tab}
				onTabChange={(next: HostDetailTab) =>
					void navigate({ search: (prev) => ({ ...prev, tab: next }) })
				}
				onToggleEnabled={() => void handleToggleEnabled()}
				toggling={updateHost.isPending}
				onDelete={() => void handleDelete()}
				deleting={deleteHost.isPending}
			/>
		</div>
	);
}

function HostDetailPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<HostDetailInner />
		</Suspense>
	);
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Trash2 } from "lucide-react";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { Suspense } from "react";
import { modelsListQueryOptions } from "@/api/hooks/models";
import {
	policyDetailQueryOptions,
	useDeletePolicy,
	usePolicy,
} from "@/api/hooks/policies";
import { providersListQueryOptions, useProviders } from "@/api/hooks/providers";
import { rateLimitsListQueryOptions } from "@/api/hooks/ratelimits";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { relayKeysListQueryOptions } from "@/api/hooks/relayKeys";
import { ApiError } from "@/api/types/errors";
import { confirm } from "@/components/ConfirmDialog";
import { PolicyForm } from "@/components/PolicyForm";
import { toast } from "@/components/Toast";

export const Route = createFileRoute("/_authenticated/policies/$name")({
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(
				policyDetailQueryOptions(params.name),
			),
			context.queryClient.ensureQueryData(hostKeysListQueryOptions),
			context.queryClient.ensureQueryData(hostsListQueryOptions),
			context.queryClient.ensureQueryData(providersListQueryOptions),
			context.queryClient.ensureQueryData(modelsListQueryOptions),
			context.queryClient.ensureQueryData(rateLimitsListQueryOptions),
			context.queryClient.ensureQueryData(relayKeysListQueryOptions),
		]),
	component: PolicyDetailPage,
});

function PolicyDetailInner() {
	const { name } = Route.useParams();
	const navigate = useNavigate({ from: "/policies/$name" });
	const { data: policy } = usePolicy(name);
	const { data: providersData } = useProviders();
	const deletePolicy = useDeletePolicy();

	const provider = (providersData.items ?? []).find(
		(p) => p.metadata.name === (policy.metadata.owner?.kind === "provider" ? (policy.metadata.owner.id ?? "") : ""),
	);

	async function handleDelete() {
		const ok = await confirm({
			title: `Delete policy ${name}?`,
			description:
				"Relay keys using this policy will lose access until reattached.",
			confirmLabel: "Delete",
			danger: true,
		});
		if (!ok) return;
		try {
			await deletePolicy.mutateAsync(policy.metadata.id ?? "");
			toast("success", `Policy "${displayLabel(policy.metadata)}" deleted.`);
			void navigate({ to: "/policies", search: { tab: "policies" } });
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError ? err.body.message : "Failed to delete policy.",
			);
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/policies"
					search={{ tab: "policies" }}
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					Policies
				</Link>
				<div className="mt-2 flex items-start justify-between gap-4">
					<div className="min-w-0">
						<h1 className="text-xl font-semibold text-foreground truncate">
							{displayLabel(policy.metadata)}
							{!hasDisplayName(policy.metadata) && (
								<span className="ml-1.5 text-[11px] text-muted-foreground font-normal">
									(no display name)
								</span>
							)}
						</h1>
						<div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
							<span>
								via{" "}
								<Link
									to="/models"
								className="text-foreground hover:underline capitalize"
								>
									{provider?.metadata.displayName ?? (policy.metadata.owner?.kind === "provider" ? (policy.metadata.owner.id ?? "") : "")}
								</Link>
							</span>
						</div>
					</div>
					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							onClick={() => void handleDelete()}
							disabled={deletePolicy.isPending}
							className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-destructive border border-border hover:bg-destructive/10 disabled:opacity-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
						>
							<Trash2 className="w-3.5 h-3.5" />
							Delete
						</button>
					</div>
				</div>
			</div>

			<PolicyForm
				policy={policy}
				onSaved={() =>
					void navigate({ to: "/policies", search: { tab: "policies" } })
				}
				onCancel={() =>
					void navigate({ to: "/policies", search: { tab: "policies" } })
				}
			/>
		</div>
	);
}

function PolicyDetailPage() {
	return (
		<Suspense
			fallback={<div className="text-muted-foreground text-sm">Loading…</div>}
		>
			<PolicyDetailInner />
		</Suspense>
	);
}

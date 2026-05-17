import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Suspense, useState } from "react";
import { hostKeysListQueryOptions } from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { policiesListQueryOptions, usePolicies } from "@/api/hooks/policies";
import { providersListQueryOptions } from "@/api/hooks/providers";
import { rateLimitsListQueryOptions } from "@/api/hooks/ratelimits";
import {
	relayKeyDetailQueryOptions,
	relayKeysListQueryOptions,
	useDeleteRelayKey,
	useRelayKey,
} from "@/api/hooks/relayKeys";
import { ApiError } from "@/api/types/errors";
import { Button } from "@/components/ui/button";
import { DiagnosticList } from "@/diagnostics/DiagnosticList";
import { useRelayKeyDiagnostics } from "@/diagnostics/useDiagnostics";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { toast } from "@/shared/Toast";

export const Route = createFileRoute("/_authenticated/relay-keys/$name")({
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(
				relayKeyDetailQueryOptions(params.name),
			),
			context.queryClient.ensureQueryData(relayKeysListQueryOptions),
			context.queryClient.ensureQueryData(policiesListQueryOptions),
			context.queryClient.ensureQueryData(hostKeysListQueryOptions),
			context.queryClient.ensureQueryData(hostsListQueryOptions),
			context.queryClient.ensureQueryData(modelsListQueryOptions),
			context.queryClient.ensureQueryData(rateLimitsListQueryOptions),
			context.queryClient.ensureQueryData(providersListQueryOptions),
		]),
	component: RelayKeyDetailPage,
});

function RelayKeyDetailInner() {
	const { name } = Route.useParams();
	const { data: rk } = useRelayKey(name);
	const { data: policiesData } = usePolicies();
	const deleteRelayKey = useDeleteRelayKey();
	const navigate = useNavigate();

	const [confirming, setConfirming] = useState(false);

	const rkId = rk.metadata.id ?? "";
	const diagnostics = useRelayKeyDiagnostics(rk.metadata.id);
	const policy = (policiesData.items ?? []).find(
		(p) => p.metadata.id === rk.spec.policyId,
	);
	const description = rk.metadata.description?.trim();
	const enabled = rk.spec.enabled ?? true;
	const revoked = rk.spec.revokedAt !== undefined && rk.spec.revokedAt !== "";

	async function handleDelete() {
		try {
			await deleteRelayKey.mutateAsync(rkId);
			toast("success", `Relay key "${displayLabel(rk.metadata)}" deleted.`);
			void navigate({
				to: "/keys",
				search: { tab: "relay", filter: "active", q: "" },
			});
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError
					? err.body.message
					: "Failed to delete relay key.",
			);
		}
	}

	return (
		<div className="flex flex-col gap-6">
			<div>
				<Link
					to="/keys"
					search={{ tab: "relay", filter: "active", q: "" }}
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					Relay keys
				</Link>
			</div>

			<div className="flex items-start justify-between gap-4">
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<h1 className="text-xl font-semibold text-foreground truncate">
							{displayLabel(rk.metadata)}
						</h1>
						<StatusBadge
							tone={revoked ? "muted" : enabled ? "active" : "warn"}
							label={revoked ? "Revoked" : enabled ? "Active" : "Disabled"}
						/>
					</div>
					{hasDisplayName(rk.metadata) && (
						<p className="mt-1 font-mono text-[11px] text-muted-foreground">
							{rk.metadata.name}
						</p>
					)}
					{description && (
						<p className="mt-2 max-w-2xl text-xs text-muted-foreground leading-relaxed">
							{description}
						</p>
					)}
				</div>
				<div className="flex gap-2 shrink-0">
					<Link to="/relay-keys/$name/edit" params={{ name }}>
						<Button type="button" variant="outline">
							Edit
						</Button>
					</Link>
					<Button
						type="button"
						variant="destructive"
						onClick={() => setConfirming(true)}
					>
						Delete
					</Button>
				</div>
			</div>

			<DiagnosticList diagnostics={diagnostics} />

			<dl className="divide-y divide-border rounded-md border border-border bg-card">
				<DetailRow label="Slug">
					<span className="font-mono text-foreground">{rk.metadata.name}</span>
				</DetailRow>
				<DetailRow label="Prefix">
					{rk.spec.prefix ? (
						<span className="font-mono text-foreground">{rk.spec.prefix}…</span>
					) : (
						<span className="text-muted-foreground">—</span>
					)}
				</DetailRow>
				<DetailRow label="Policy">
					{policy ? (
						<Link
							to="/policies/$name"
							params={{ name: policy.metadata.name }}
							className="text-primary hover:underline"
						>
							{displayLabel(policy.metadata)}
						</Link>
					) : (
						<span className="text-muted-foreground">
							Unknown policy ({rk.spec.policyId})
						</span>
					)}
				</DetailRow>
				<DetailRow label="Enabled">{enabled ? "Yes" : "No"}</DetailRow>
				<DetailRow label="Passthrough allowed">
					{rk.spec.passthroughAllowed ? "Yes" : "No"}
				</DetailRow>
				{revoked && (
					<DetailRow label="Revoked at">
						<span className="font-mono text-foreground">
							{rk.spec.revokedAt}
						</span>
					</DetailRow>
				)}
			</dl>

			{confirming && (
				<DeleteConfirm
					resourceName={rk.metadata.name}
					onConfirm={() => void handleDelete()}
					onCancel={() => setConfirming(false)}
					isPending={deleteRelayKey.isPending}
				/>
			)}
		</div>
	);
}

function DetailRow({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1 sm:gap-4">
			<dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</dt>
			<dd className="text-xs text-foreground">{children}</dd>
		</div>
	);
}

function StatusBadge({
	tone,
	label,
}: {
	tone: "active" | "muted" | "warn";
	label: string;
}) {
	const cls =
		tone === "active"
			? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
			: tone === "warn"
				? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
				: "border-border bg-muted text-muted-foreground";
	return (
		<span
			className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${cls}`}
		>
			{label}
		</span>
	);
}

function RelayKeyDetailPage() {
	return (
		<Suspense
			fallback={<div className="text-muted-foreground text-sm">Loading…</div>}
		>
			<RelayKeyDetailInner />
		</Suspense>
	);
}

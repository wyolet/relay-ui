import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	Activity,
	ChevronLeft,
	KeyRound,
	Pencil,
	Power,
	ShieldCheck,
	Trash2,
} from "lucide-react";
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
import type { Policy } from "@/api/types/policy";
import { DiagnosticList } from "@/diagnostics/DiagnosticList";
import { useRelayKeyDiagnostics } from "@/diagnostics/useDiagnostics";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { useToggleRelayKeyEnabled } from "@/relay-keys/useToggleRelayKeyEnabled";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { PageLoader } from "@/shared/Spinner";
import { toast } from "@/shared/Toast";
import { ResourceUsage } from "@/usage/ResourceUsage";

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
	const { setEnabled, isPending: isToggling } = useToggleRelayKeyEnabled();
	const navigate = useNavigate();

	const [confirming, setConfirming] = useState(false);

	const rkId = rk.metadata.id ?? "";
	const diagnostics = useRelayKeyDiagnostics(rk.metadata.id);
	const policy = (policiesData.items ?? []).find(
		(p) => p.metadata.id === rk.spec.policyId,
	);
	const description = rk.metadata.description?.trim();
	const enabled = rk.spec.enabled !== false;

	async function handleDelete() {
		try {
			await deleteRelayKey.mutateAsync(rkId);
			toast("success", `Relay key "${displayLabel(rk.metadata)}" deleted.`);
			void navigate({
				to: "/keys",
				search: { tab: "relay", q: "" },
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
		<div className="flex flex-col gap-5">
			<Link
				to="/keys"
				search={{ tab: "relay", q: "" }}
				className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
			>
				<ChevronLeft className="w-3.5 h-3.5" />
				Relay keys
			</Link>

			<header className="flex items-start justify-between gap-4">
				<div className="min-w-0 flex items-start gap-3">
					<div className="mt-0.5 w-9 h-9 rounded-md bg-muted border border-border shrink-0 flex items-center justify-center">
						<KeyRound className="w-4 h-4 text-muted-foreground" aria-hidden />
					</div>
					<div className="min-w-0">
						<h1 className="text-xl font-semibold text-foreground truncate flex items-center gap-2">
							{displayLabel(rk.metadata)}
							{!hasDisplayName(rk.metadata) && (
								<span className="text-[11px] text-muted-foreground font-normal">
									(no display name)
								</span>
							)}
							<StatusBadge enabled={enabled} />
							{rk.spec.passthroughAllowed && (
								<span
									className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30"
									title="This relay key can request models outside its policy's grant."
								>
									Passthrough
								</span>
							)}
						</h1>
						<p className="mt-1 text-xs text-muted-foreground font-mono truncate">
							{rk.metadata.name}
						</p>
						{rk.spec.prefix && (
							<p className="mt-0.5 text-[11px] text-muted-foreground">
								prefix{" "}
								<code className="font-mono text-foreground">
									{rk.spec.prefix}…
								</code>
							</p>
						)}
						{description && (
							<p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
								{description}
							</p>
						)}
					</div>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					<button
						type="button"
						onClick={() => void setEnabled(rk, !enabled)}
						disabled={isToggling}
						className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-foreground border border-border hover:bg-muted disabled:opacity-50 transition-colors"
					>
						<Power className="w-3.5 h-3.5" />
						{enabled ? "Disable" : "Enable"}
					</button>
					<Link
						to="/relay-keys/$name/edit"
						params={{ name }}
						className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-foreground border border-border hover:bg-muted transition-colors"
					>
						<Pencil className="w-3.5 h-3.5" />
						Edit
					</Link>
					<button
						type="button"
						onClick={() => setConfirming(true)}
						className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-destructive border border-border hover:bg-destructive/10 transition-colors"
					>
						<Trash2 className="w-3.5 h-3.5" />
						Delete
					</button>
				</div>
			</header>

			<DiagnosticList diagnostics={diagnostics} />

			<PolicyCard policy={policy} policyId={rk.spec.policyId} />

			<Card title="Configuration" icon={KeyRound}>
				<dl className="divide-y divide-border">
					<Row label="Prefix">
						{rk.spec.prefix ? (
							<code className="font-mono text-foreground">
								{rk.spec.prefix}…
							</code>
						) : (
							<span className="text-muted-foreground">—</span>
						)}
					</Row>
					<Row label="Passthrough">
						{rk.spec.passthroughAllowed ? (
							<span className="text-foreground">
								Allowed —{" "}
								<span className="text-muted-foreground">
									requests may target models outside the policy's grant
								</span>
							</span>
						) : (
							<span className="text-foreground">
								Blocked —{" "}
								<span className="text-muted-foreground">
									requests must match a policy-granted model
								</span>
							</span>
						)}
					</Row>
				</dl>
			</Card>

			{rk.spec.keyHash && (
				<Card title="Usage" icon={Activity}>
					<ResourceUsage scope="relay_key_hash" id={rk.spec.keyHash} />
				</Card>
			)}

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

function PolicyCard({
	policy,
	policyId,
}: {
	policy: Policy | undefined;
	policyId: string | undefined;
}) {
	if (!policyId) {
		return (
			<Card title="Policy" icon={ShieldCheck}>
				<p className="text-xs text-muted-foreground">
					No policy attached — this relay key cannot route any requests.
				</p>
			</Card>
		);
	}
	if (!policy) {
		return (
			<Card title="Policy" icon={ShieldCheck}>
				<p className="text-xs text-destructive">
					Unknown policy{" "}
					<code className="font-mono text-[11px]">{policyId}</code>
				</p>
			</Card>
		);
	}
	const enabled = policy.spec.enabled !== false;
	const grantCount = policy.spec.models?.length ?? 0;
	const poolSize = policy.spec.hostKeyIds?.length ?? 0;
	const rlCount =
		(policy.spec.rateLimitId ? 1 : 0) + (policy.spec.rlBindings?.length ?? 0);
	const hostOwned = policy.metadata.owner?.kind === "host";

	return (
		<Card title="Policy" icon={ShieldCheck}>
			<div className="flex items-start gap-3">
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2 flex-wrap">
						<Link
							to="/policies/$name"
							params={{ name: policy.metadata.name }}
							className="text-sm font-medium text-foreground hover:underline truncate"
						>
							{displayLabel(policy.metadata)}
						</Link>
						{enabled ? (
							<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60">
								Enabled
							</span>
						) : (
							<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
								Disabled
							</span>
						)}
						{hostOwned && (
							<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
								Host-owned
							</span>
						)}
					</div>
					<p className="mt-0.5 text-[11px] text-muted-foreground font-mono truncate">
						{policy.metadata.name}
					</p>
					{policy.metadata.description && (
						<p className="mt-1 text-[11px] text-muted-foreground max-w-2xl">
							{policy.metadata.description}
						</p>
					)}
					<dl className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-[11px]">
						<Stat label="Catalog grants" value={grantCount} />
						<Stat label="Host-key pool" value={poolSize} />
						<Stat label="Rate limits" value={rlCount} />
					</dl>
				</div>
			</div>
		</Card>
	);
}

function Stat({ label, value }: { label: string; value: number }) {
	return (
		<div className="inline-flex items-baseline gap-1">
			<dt className="text-muted-foreground">{label}</dt>
			<dd
				className={`tabular-nums ${value === 0 ? "text-muted-foreground" : "text-foreground font-medium"}`}
			>
				{value}
			</dd>
		</div>
	);
}

function Card({
	title,
	icon: Icon,
	children,
}: {
	title: string;
	icon: typeof KeyRound;
	children: React.ReactNode;
}) {
	return (
		<section className="rounded-md border border-border bg-card">
			<header className="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
				<Icon className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
				<h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
					{title}
				</h2>
			</header>
			<div className="px-4 py-3">{children}</div>
		</section>
	);
}

function Row({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="py-3 first:pt-0 last:pb-0 grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-1 sm:gap-4">
			<dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</dt>
			<dd className="text-xs text-foreground min-w-0">{children}</dd>
		</div>
	);
}

function StatusBadge({ enabled }: { enabled: boolean }) {
	return enabled ? (
		<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60">
			Active
		</span>
	) : (
		<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
			Disabled
		</span>
	);
}

function RelayKeyDetailPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<RelayKeyDetailInner />
		</Suspense>
	);
}

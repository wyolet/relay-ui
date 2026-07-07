import { Link, useNavigate } from "@tanstack/react-router";
import {
	Activity,
	ChevronLeft,
	KeyRound,
	RotateCw,
	ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { usePolicies } from "@/api/hooks/policies";
import { useDeleteRelayKey, useRelayKey } from "@/api/hooks/relayKeys";
import { ApiError } from "@/api/types/errors";
import type { Policy } from "@/api/types/policy";
import { Button } from "@/components/ui/button";
import { DiagnosticList } from "@/diagnostics/DiagnosticList";
import { useRelayKeyDiagnostics } from "@/diagnostics/useDiagnostics";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { RelayKeyRotateDialog } from "@/relay-keys/RelayKeyRotateDialog";
import { useToggleRelayKeyEnabled } from "@/relay-keys/useToggleRelayKeyEnabled";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { StatusBadge } from "@/shared/StatusBadge";
import { toast } from "@/shared/Toast";
import { ResourceUsage } from "@/usage/ResourceUsage";

export function RelayKeyDetailView({ name }: { name: string }) {
	const { data: rk } = useRelayKey(name);
	const { data: policiesData } = usePolicies();
	const deleteRelayKey = useDeleteRelayKey();
	const { setEnabled, isPending: isToggling } = useToggleRelayKeyEnabled();
	const navigate = useNavigate();

	const [confirming, setConfirming] = useState(false);
	const [rotating, setRotating] = useState(false);

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
							<StatusBadge enabled={enabled} enabledLabel="Active" />
							{rk.spec.passthroughAllowed && (
								<span
									className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-warning/10 text-warning border border-warning/30"
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
				<DetailHeaderActions
					enabled={enabled}
					onToggle={() => void setEnabled(rk, !enabled)}
					toggling={isToggling}
					onDelete={() => setConfirming(true)}
					editLink={({ className, content }) => (
						<Link
							to="/relay-keys/$name/edit"
							params={{ name }}
							className={className}
						>
							{content}
						</Link>
					)}
				>
					<Button
						type="button"
						variant="outline"
						size="lg"
						onClick={() => setRotating(true)}
					>
						<RotateCw className="size-3.5" />
						Rotate
					</Button>
				</DetailHeaderActions>
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

			{rotating && (
				<RelayKeyRotateDialog rk={rk} onClose={() => setRotating(false)} />
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
							<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-success-soft text-success border border-success/30">
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
						<Stat label="Credential pool" value={poolSize} />
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

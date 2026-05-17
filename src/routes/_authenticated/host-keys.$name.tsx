import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ChevronLeft,
	Copy,
	KeyRound,
	Link2,
	Pencil,
	ShieldCheck,
	Trash2,
	Unlink2,
} from "lucide-react";
import { Suspense } from "react";
import {
	hostKeyDetailQueryOptions,
	hostKeysListQueryOptions,
} from "@/api/hooks/hostkeys";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { providersListQueryOptions } from "@/api/hooks/providers";
import { rateLimitsListQueryOptions } from "@/api/hooks/ratelimits";
import { relayKeysListQueryOptions } from "@/api/hooks/relayKeys";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { SecretRotateDialog } from "@/components/SecretRotateDialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useHostKeyDetail } from "@/components/useHostKeyDetail";
import { DiagnosticList } from "@/diagnostics/DiagnosticList";
import { useHostKeyDiagnostics } from "@/diagnostics/useDiagnostics";

export const Route = createFileRoute("/_authenticated/host-keys/$name")({
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(
				hostKeyDetailQueryOptions(params.name),
			),
			context.queryClient.ensureQueryData(hostKeysListQueryOptions),
			context.queryClient.ensureQueryData(hostsListQueryOptions),
			context.queryClient.ensureQueryData(policiesListQueryOptions),
			context.queryClient.ensureQueryData(modelsListQueryOptions),
			context.queryClient.ensureQueryData(rateLimitsListQueryOptions),
			context.queryClient.ensureQueryData(relayKeysListQueryOptions),
			context.queryClient.ensureQueryData(providersListQueryOptions),
		]),
	component: HostKeyDetailPage,
});

function HostKeyDetailInner() {
	const { name } = Route.useParams();
	const navigate = useNavigate();
	const {
		hk,
		view,
		referencingPolicies,
		confirming,
		rotating,
		isDeletingPending,
		attemptDelete,
		confirmDelete,
		cancelDelete,
		openRotate,
		closeRotate,
		copyId,
		setEnabled,
		isToggling,
		detachFromPolicy,
		isDetachPending,
	} = useHostKeyDetail({
		name,
		onDeleted: () =>
			void navigate({
				to: "/keys",
				search: { tab: "provider", filter: "active", q: "" },
			}),
	});
	const diagnostics = useHostKeyDiagnostics(hk.metadata.id);

	return (
		<div className="flex flex-col gap-6">
			<div>
				<Link
					to="/keys"
					search={{ tab: "provider", filter: "active", q: "" }}
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					Host keys
				</Link>
			</div>

			<header className="flex items-start justify-between gap-4">
				<div className="min-w-0 flex flex-col gap-1.5">
					<div className="flex items-center gap-2 flex-wrap">
						<h1 className="text-xl font-semibold text-foreground truncate">
							{view.displayName}
						</h1>
						<KindBadge stored={view.isStored} />
					</div>
					{view.hasDisplayName && (
						<p className="font-mono text-[11px] text-muted-foreground">
							{view.slug}
						</p>
					)}
					{view.description && (
						<p className="mt-1 max-w-2xl text-xs text-muted-foreground leading-relaxed">
							{view.description}
						</p>
					)}
				</div>
				<div className="flex items-center gap-3 shrink-0">
					<label className="inline-flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
						<Switch
							checked={view.enabled}
							onCheckedChange={(next) => void setEnabled(next)}
							disabled={isToggling}
							aria-label={view.enabled ? "Disable host key" : "Enable host key"}
						/>
						<span className="font-medium">
							{view.enabled ? "Enabled" : "Disabled"}
						</span>
					</label>
					<Link to="/host-keys/$name/edit" params={{ name }}>
						<Button type="button" variant="outline">
							<Pencil className="w-3.5 h-3.5" />
							Edit
						</Button>
					</Link>
					<Button type="button" variant="destructive" onClick={attemptDelete}>
						<Trash2 className="w-3.5 h-3.5" />
						Delete
					</Button>
				</div>
			</header>

			<DiagnosticList diagnostics={diagnostics} />

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				<Card title="Configuration" icon={ShieldCheck} className="lg:col-span-2">
					<dl className="divide-y divide-border">
						<Row label="Host">
							{view.hostName ? (
								<Link
									to="/host-keys"
									className="text-primary hover:underline"
								>
									{view.hostLabel}
								</Link>
							) : (
								<span className="text-foreground">{view.hostLabel}</span>
							)}
						</Row>
						<Row label="Host policy">
							{view.hostPolicyLabel === null ? (
								<span className="text-muted-foreground">— (none set)</span>
							) : view.hostPolicyName ? (
								<Link
									to="/policies/$name"
									params={{ name: view.hostPolicyName }}
									className="text-primary hover:underline"
								>
									{view.hostPolicyLabel}
								</Link>
							) : (
								<span className="text-foreground">{view.hostPolicyLabel}</span>
							)}
							<p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">
								Mirrors the provider's own tier — acts as a hard cap on user
								policies that route through this key.
							</p>
						</Row>
						{view.defaultTier && (
							<Row label="Default tier">
								<span className="font-mono text-foreground">
									{view.defaultTier}
								</span>
							</Row>
						)}
						<Row label="Source">
							{view.sourceLabel}
							{!view.isStored && view.envVar && (
								<p className="mt-1 text-[11px] text-muted-foreground">
									Reads from{" "}
									<code className="font-mono text-foreground/80">
										${view.envVar}
									</code>{" "}
									on the relay deployment.
								</p>
							)}
						</Row>
					</dl>
				</Card>

				<Card title="Secret" icon={KeyRound}>
					{view.isStored ? (
						<div className="flex flex-col gap-3">
							<div className="flex items-center gap-2">
								<span className="font-mono text-sm text-muted-foreground">
									••••••••••••
								</span>
								<span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
									encrypted at rest
								</span>
							</div>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={openRotate}
							>
								Rotate value
							</Button>
							<p className="text-[11px] text-muted-foreground leading-snug">
								Rotating issues a new ciphertext. The plaintext never leaves
								your browser after submission.
							</p>
						</div>
					) : (
						<div className="flex flex-col gap-2">
							<p className="text-xs text-foreground">
								Sourced from environment at request time.
							</p>
							{view.envVar ? (
								<code className="inline-flex items-center self-start rounded-md border border-border bg-muted px-2 py-1 text-[11px] font-mono text-foreground">
									${view.envVar}
								</code>
							) : (
								<p className="text-[11px] text-destructive">
									No env var configured.
								</p>
							)}
							<p className="text-[11px] text-muted-foreground leading-snug">
								Set this variable on the relay deployment. Edit to change.
							</p>
						</div>
					)}
				</Card>

				<Card
					title="Attached to user policies"
					icon={Link2}
					className="lg:col-span-3"
				>
					{referencingPolicies.length === 0 ? (
						<p className="text-xs text-muted-foreground">
							This host key is not attached to any user policy. Attach it from a
							policy's host-key pool to start routing traffic through it.
						</p>
					) : (
						<ul className="divide-y divide-border">
							{referencingPolicies.map((p) => (
								<li
									key={p.id}
									className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
								>
									<div className="min-w-0 flex flex-col gap-0.5">
										<Link
											to="/policies/$name"
											params={{ name: p.name }}
											className="text-sm font-medium text-foreground hover:text-primary hover:underline truncate"
										>
											{p.label}
										</Link>
										{p.hasDisplayName && (
											<code className="font-mono text-[11px] text-muted-foreground">
												{p.name}
											</code>
										)}
										{p.description && (
											<p className="mt-1 text-[11px] text-muted-foreground leading-snug">
												{p.description}
											</p>
										)}
									</div>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => void detachFromPolicy(p.id)}
										disabled={isDetachPending}
									>
										<Unlink2 className="w-3 h-3" />
										Detach
									</Button>
								</li>
							))}
						</ul>
					)}
				</Card>

				<Card title="Identifiers" icon={Copy} className="lg:col-span-3">
					<dl className="divide-y divide-border">
						<Row label="Slug">
							<span className="font-mono text-foreground">{view.slug}</span>
						</Row>
						<Row label="ID">
							<button
								type="button"
								onClick={() => void copyId()}
								className="group inline-flex items-center gap-1.5 font-mono text-foreground hover:text-primary transition-colors"
								title="Copy ID"
							>
								<span className="truncate">{view.id || "—"}</span>
								<Copy className="w-3 h-3 opacity-60 group-hover:opacity-100" />
							</button>
						</Row>
					</dl>
				</Card>
			</div>

			{rotating && <SecretRotateDialog hk={hk} onClose={closeRotate} />}

			{confirming && (
				<DeleteConfirm
					resourceName={view.slug}
					onConfirm={() => void confirmDelete()}
					onCancel={cancelDelete}
					isPending={isDeletingPending}
				/>
			)}
		</div>
	);
}

function Card({
	title,
	icon: Icon,
	children,
	className,
}: {
	title: string;
	icon: typeof KeyRound;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<section
			className={`rounded-md border border-border bg-card ${className ?? ""}`}
		>
			<header className="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
				<Icon className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
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

function KindBadge({ stored }: { stored: boolean }) {
	return (
		<span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
			{stored ? "stored" : "env"}
		</span>
	);
}

function HostKeyDetailPage() {
	return (
		<Suspense
			fallback={<div className="text-muted-foreground text-sm">Loading…</div>}
		>
			<HostKeyDetailInner />
		</Suspense>
	);
}

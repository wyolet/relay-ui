import { Link, useNavigate } from "@tanstack/react-router";
import {
	ChevronLeft,
	KeyRound,
	Link2,
	ShieldCheck,
	Unlink2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiagnosticList } from "@/diagnostics/DiagnosticList";
import { useHostKeyDiagnostics } from "@/diagnostics/useDiagnostics";
import { SecretRotateDialog } from "@/host-keys/SecretRotateDialog";
import {
	type AttachedPolicyRow,
	useHostKeyDetail,
} from "@/host-keys/useHostKeyDetail";
import { HostLogo } from "@/hosts/HostLogo";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { StatusBadge } from "@/shared/StatusBadge";
import { Th } from "@/shared/Th";

export function HostKeyDetailView({ name }: { name: string }) {
	const navigate = useNavigate();
	const {
		hk,
		view,
		attachedPolicies,
		confirming,
		rotating,
		isDeletingPending,
		attemptDelete,
		confirmDelete,
		cancelDelete,
		openRotate,
		closeRotate,
		setEnabled,
		isToggling,
		detachFromPolicy,
		isDetachPending,
	} = useHostKeyDetail({
		name,
		onDeleted: () =>
			void navigate({
				to: "/keys",
				search: { tab: "provider", q: "" },
			}),
	});
	const diagnostics = useHostKeyDiagnostics(hk.metadata.id);

	return (
		<div className="flex flex-col gap-5">
			<Link
				to="/keys"
				search={{ tab: "provider", q: "" }}
				className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
			>
				<ChevronLeft className="w-3.5 h-3.5" />
				Credentials
			</Link>

			<header className="flex items-start justify-between gap-4">
				<div className="min-w-0 flex items-start gap-3">
					{view.host ? (
						<HostLogo host={view.host} size={36} className="mt-0.5 shrink-0" />
					) : (
						<div className="mt-0.5 w-9 h-9 rounded-md bg-muted border border-border shrink-0" />
					)}
					<div className="min-w-0">
						<h1 className="text-xl font-semibold text-foreground truncate flex items-center gap-2">
							{view.displayName}
							<StatusBadge enabled={view.enabled} />
							<KindBadge stored={view.isStored} />
						</h1>
						<p className="mt-1 text-xs text-muted-foreground font-mono truncate">
							{view.slug}
						</p>
						<p className="mt-0.5 text-[11px] text-muted-foreground">
							on{" "}
							{view.hostName ? (
								<Link
									to="/host-keys"
									className="text-foreground hover:underline"
								>
									{view.hostLabel}
								</Link>
							) : (
								<span className="text-foreground">{view.hostLabel}</span>
							)}
						</p>
						{view.description && (
							<p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
								{view.description}
							</p>
						)}
					</div>
				</div>
				<DetailHeaderActions
					enabled={view.enabled}
					onToggle={() => void setEnabled(!view.enabled)}
					toggling={isToggling}
					onDelete={attemptDelete}
					editLink={({ className, content }) => (
						<Link
							to="/host-keys/$name/edit"
							params={{ name }}
							className={className}
						>
							{content}
						</Link>
					)}
				/>
			</header>

			<DiagnosticList diagnostics={diagnostics} />

			<Card title="Configuration" icon={ShieldCheck}>
				<dl className="divide-y divide-border">
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
					<Row label="Secret">
						{view.isStored ? (
							<div className="flex items-center gap-2 flex-wrap">
								<span className="font-mono text-sm text-muted-foreground">
									••••••••••••
								</span>
								<span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
									encrypted at rest
								</span>
								<Button type="button" variant="outline" onClick={openRotate}>
									<KeyRound className="size-3" />
									Rotate
								</Button>
							</div>
						) : view.envVar ? (
							<div className="flex items-center gap-2 flex-wrap">
								<code className="inline-flex items-center rounded-md border border-border bg-muted px-2 py-1 text-[11px] font-mono text-foreground">
									${view.envVar}
								</code>
								<span className="text-[11px] text-muted-foreground">
									resolved at request time
								</span>
							</div>
						) : (
							<span className="text-[11px] text-destructive">
								No env var configured.
							</span>
						)}
					</Row>
				</dl>
			</Card>

			<PoliciesPanel
				rows={attachedPolicies}
				onDetach={(id) => void detachFromPolicy(id)}
				detaching={isDetachPending}
			/>

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

function PoliciesPanel({
	rows,
	onDetach,
	detaching,
}: {
	rows: AttachedPolicyRow[];
	onDetach: (policyId: string) => void;
	detaching: boolean;
}) {
	if (rows.length === 0) {
		return (
			<Card title="Attached to user policies" icon={Link2}>
				<p className="text-xs text-muted-foreground">
					This credential is not attached to any user policy. Attach it from a
					policy's credential pool to start routing traffic through it.
				</p>
			</Card>
		);
	}

	return (
		<section>
			<div className="mb-2 flex items-baseline justify-between gap-2">
				<h2 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
					Attached to user policies
				</h2>
				<span className="text-[10px] text-muted-foreground tabular-nums">
					{rows.length} polic{rows.length === 1 ? "y" : "ies"}
				</span>
			</div>
			<div className="rounded-md border border-border bg-card overflow-hidden">
				<table className="w-full text-sm">
					<thead className="bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground">
						<tr>
							<Th>Policy</Th>
							<Th className="text-right">Pool</Th>
							<Th className="text-right">API keys</Th>
							<Th className="text-right">Status</Th>
							<Th className="text-right">Action</Th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{rows.map((row) => (
							<tr key={row.id} className="hover:bg-muted/30 transition-colors">
								<Td>
									<div className="min-w-0">
										<Link
											to="/policies/$name"
											params={{ name: row.name }}
											className="text-foreground hover:underline truncate font-medium"
										>
											{row.label}
										</Link>
										<div className="text-[11px] text-muted-foreground font-mono truncate">
											{row.name}
											{row.hostOwned && (
												<span className="ml-1.5 text-[9px] uppercase tracking-wide">
													· host-owned
												</span>
											)}
										</div>
									</div>
								</Td>
								<Td className="text-right tabular-nums">
									<span
										className={
											row.poolSize <= 1
												? "text-muted-foreground"
												: "text-foreground"
										}
										title={`${row.poolSize} credential${row.poolSize === 1 ? "" : "s"} in this policy's pool`}
									>
										1 / {row.poolSize}
									</span>
								</Td>
								<Td className="text-right tabular-nums">
									<span
										className={
											row.keyCount === 0
												? "text-muted-foreground"
												: "text-foreground"
										}
									>
										{row.keyCount}
									</span>
								</Td>
								<Td className="text-right">
									{row.enabled ? (
										<span className="text-[11px] text-success">Enabled</span>
									) : (
										<span className="text-[11px] text-muted-foreground">
											Disabled
										</span>
									)}
								</Td>
								<Td className="text-right">
									<Button
										type="button"
										variant="outline"
										onClick={() => onDetach(row.id)}
										disabled={detaching || row.hostOwned}
										title={
											row.hostOwned
												? "Host-owned policy — managed by Relay"
												: "Remove this key from the policy's pool"
										}
									>
										<Unlink2 className="size-3" />
										Detach
									</Button>
								</Td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</section>
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
				<Icon
					className="w-3.5 h-3.5 text-muted-foreground"
					aria-hidden="true"
				/>
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

function Td({
	children,
	className = "",
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return <td className={`px-3 py-2 align-middle ${className}`}>{children}</td>;
}

function KindBadge({ stored }: { stored: boolean }) {
	return (
		<span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-muted text-muted-foreground border border-border">
			{stored ? "stored" : "env"}
		</span>
	);
}

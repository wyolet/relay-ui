import { Link, useNavigate } from "@tanstack/react-router";
import {
	Activity,
	ChevronLeft,
	KeyRound,
	RotateCw,
	ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { useDeleteKey, useKey } from "@/api/hooks/keys";
import { Button } from "@/components/ui/button";
import { DiagnosticList } from "@/diagnostics/DiagnosticList";
import { useKeyDiagnostics } from "@/diagnostics/useDiagnostics";
import { KeyRotateDialog } from "@/keys/KeyRotateDialog";
import { useToggleKeyEnabled } from "@/keys/useToggleKeyEnabled";
import { displayLabel } from "@/lib/displayLabel";
import { PrincipalPolicy } from "@/policy-bindings/PrincipalPolicy";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { DetailPageHeader } from "@/shared/DetailPageHeader";
import { StatusBadge } from "@/shared/StatusBadge";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";
import { ResourceUsage } from "@/usage/ResourceUsage";

export function KeyDetailView({ name }: { name: string }) {
	const { data: rk } = useKey(name);
	const { setEnabled, isPending: isToggling } = useToggleKeyEnabled();
	const navigate = useNavigate();
	const del = useConfirmedDelete(useDeleteKey(), {
		noun: "key",
		onDeleted: () =>
			void navigate({ to: "/keys", search: { tab: "relay", q: "" } }),
	});

	const [rotating, setRotating] = useState(false);

	const rkId = rk.metadata.id ?? "";
	const diagnostics = useKeyDiagnostics(rk.metadata.id);
	const enabled = rk.spec.enabled !== false;

	return (
		<div className="flex flex-col gap-5">
			<Link
				to="/keys"
				search={{ tab: "relay", q: "" }}
				className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
			>
				<ChevronLeft className="w-3.5 h-3.5" />
				API keys
			</Link>

			<DetailPageHeader
				icon={KeyRound}
				metadata={rk.metadata}
				badges={
					<>
						<StatusBadge enabled={enabled} enabledLabel="Active" />
						{rk.spec.passthroughAllowed && (
							<span
								className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-warning/10 text-warning border border-warning/30"
								title="This key can request models outside its policy's grant."
							>
								Passthrough
							</span>
						)}
					</>
				}
				extra={
					rk.spec.prefix && (
						<p className="mt-0.5 text-[11px] text-muted-foreground">
							prefix{" "}
							<code className="font-mono text-foreground">
								{rk.spec.prefix}…
							</code>
						</p>
					)
				}
			>
				<DetailHeaderActions
					enabled={enabled}
					onToggle={() => void setEnabled(rk, !enabled)}
					toggling={isToggling}
					onDelete={() =>
						del.request({
							id: rkId,
							name: rk.metadata.name,
							label: displayLabel(rk.metadata),
						})
					}
					editLink={({ className, content }) => (
						<Link to="/keys/$name/edit" params={{ name }} className={className}>
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
			</DetailPageHeader>

			<DiagnosticList diagnostics={diagnostics} />

			<Card title="Policy" icon={ShieldCheck}>
				<div className="text-xs">
					<PrincipalPolicy principal={rk.spec.principal} />
				</div>
			</Card>

			<Card title="Configuration" icon={KeyRound}>
				<dl className="divide-y divide-border">
					<Row label="Principal">
						<span className="text-foreground">
							{rk.spec.principal.kind === "user" ? "User" : "Service account"}{" "}
							<code className="font-mono text-[11px] text-muted-foreground">
								{rk.spec.principal.id}
							</code>
						</span>
					</Row>
					<Row label="Expires">
						{rk.spec.expiresAt ? (
							<span className="text-foreground">
								{new Date(rk.spec.expiresAt).toLocaleString()}
							</span>
						) : (
							<span className="text-muted-foreground">Never</span>
						)}
					</Row>
					<Row label="Rotation grace">
						{rk.spec.graceUntil ? (
							<span className="text-foreground">
								Previous secret valid until{" "}
								{new Date(rk.spec.graceUntil).toLocaleString()}
							</span>
						) : (
							<span className="text-muted-foreground">—</span>
						)}
					</Row>
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
				<KeyRotateDialog rk={rk} onClose={() => setRotating(false)} />
			)}

			{del.target && (
				<DeleteConfirm
					resourceName={del.target.name}
					onConfirm={() => void del.confirm()}
					onCancel={del.cancel}
					isPending={del.isPending}
					error={del.error}
				/>
			)}
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

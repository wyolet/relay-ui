import { Link } from "@tanstack/react-router";
import { AlertTriangle, KeyRound, Plus } from "lucide-react";
import type { Policy } from "@/api/types/policy";
import { HostLogo, hostRefLogo } from "@/hosts/HostLogo";
import { type PolicyHostView, usePolicyHosts } from "@/policies/usePolicyHosts";

interface Props {
	policy: Policy;
}

/**
 * Host keys reaching the hosts this policy can serve, resolved server-side via
 * `GET /policies/{ref}/hosts`. Each row is a host the policy's catalog reaches,
 * with the host-keys attached to it. A host with no key is flagged — `required`
 * means requests there will fail; `optional` means a sibling host can cover the
 * same models. All state (host/key enabled, sharing, requirement) is server-fed.
 */
export function PolicyKeysTab({ policy }: Props) {
	const hosts = usePolicyHosts(policy.metadata.name);
	const policyName = policy.metadata.name;

	if (hosts.length === 0) {
		return (
			<div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-center mt-2">
				<div className="text-sm font-medium text-foreground">
					Nothing to show
				</div>
				<div className="mt-0.5 text-xs text-muted-foreground">
					Pick models on the Models tab, then attach credentials in the edit
					form.
				</div>
			</div>
		);
	}

	// Hosts missing a key surface first — they're the actionable items —
	// then required before optional, then by label.
	const rows = [...hosts].sort((a, b) => {
		const am = missingScore(a);
		const bm = missingScore(b);
		if (am !== bm) return am - bm;
		return hostLabel(a).localeCompare(hostLabel(b));
	});

	return (
		<div className="flex flex-col gap-3 pt-2">
			<div className="rounded-md border border-border bg-card overflow-hidden">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-border bg-muted/30 text-left">
							<th className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
								Host
							</th>
							<th className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
								Credentials
							</th>
							<th className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-medium text-right">
								Status
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{rows.map((row) => (
							<HostRow key={row.host.id} row={row} policyName={policyName} />
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

function HostRow({
	row,
	policyName,
}: {
	row: PolicyHostView;
	policyName: string;
}) {
	const keys = row.hostKeys ?? [];
	const missing = keys.length === 0;
	const required = row.requirement === "required";
	const hostOff = row.host.enabled === false;
	// A missing key only truly breaks routing when the host is required.
	const showAsBreaking = missing && required;

	return (
		<tr
			className={
				showAsBreaking
					? "bg-warning/5 hover:bg-warning/10"
					: "hover:bg-muted/40"
			}
		>
			<td className="px-3 py-2">
				<div className="flex items-center gap-2 min-w-0">
					<HostLogo host={hostRefLogo(row.host)} size={20} />
					<span className="text-foreground truncate">{hostLabel(row)}</span>
					<span className="text-[11px] text-muted-foreground font-mono truncate">
						{row.host.name}
					</span>
					{hostOff && <StatusPill tone="warn">host off</StatusPill>}
				</div>
			</td>
			<td className="px-3 py-2">
				{missing ? (
					<span
						className={`inline-flex items-center gap-1.5 text-[11px] ${
							showAsBreaking ? "text-warning" : "text-muted-foreground"
						}`}
					>
						<AlertTriangle className="w-3.5 h-3.5" aria-hidden />
						{showAsBreaking
							? "No key — requests here will fail"
							: "No key — a sibling host can cover these models"}
					</span>
				) : (
					<ul className="flex flex-wrap gap-x-3 gap-y-1">
						{keys.map((k) => (
							<li key={k.id} className="flex items-center gap-1.5">
								<Link
									to="/host-keys/$name"
									params={{ name: k.name }}
									className="inline-flex items-center gap-1.5 text-foreground hover:underline"
								>
									<KeyRound
										className="w-3.5 h-3.5 text-muted-foreground shrink-0"
										aria-hidden
									/>
									{k.name}
								</Link>
								{k.enabled === false && (
									<StatusPill tone="warn">key off</StatusPill>
								)}
								{k.sharedWithPolicyCount > 0 && (
									<span
										className="text-[10px] text-muted-foreground tabular-nums"
										title="Other policies using this key"
									>
										+{k.sharedWithPolicyCount} other polic
										{k.sharedWithPolicyCount === 1 ? "y" : "ies"}
									</span>
								)}
							</li>
						))}
					</ul>
				)}
			</td>
			<td className="px-3 py-2 text-right">
				{missing ? (
					showAsBreaking ? (
						<Link
							to="/policies/$name/edit"
							params={{ name: policyName }}
							className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
						>
							<Plus className="w-3 h-3" />
							Attach key
						</Link>
					) : (
						<StatusPill tone="muted">optional</StatusPill>
					)
				) : (
					<StatusPill tone="ok">reachable</StatusPill>
				)}
			</td>
		</tr>
	);
}

/** Sort weight: breaking (required+missing) first, then optional-missing, then keyed. */
function missingScore(row: PolicyHostView): number {
	const missing = (row.hostKeys?.length ?? 0) === 0;
	if (!missing) return 2;
	return row.requirement === "required" ? 0 : 1;
}

function hostLabel(row: PolicyHostView): string {
	return row.host.displayName?.trim() || row.host.name;
}

function StatusPill({
	tone,
	title,
	children,
}: {
	tone: "ok" | "warn" | "muted";
	title?: string;
	children: React.ReactNode;
}) {
	const className =
		tone === "ok"
			? "bg-success-soft text-success border-success/30"
			: tone === "warn"
				? "bg-warning/10 text-warning border-warning/30"
				: "bg-muted text-muted-foreground border-border";
	return (
		<span
			title={title}
			className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap ${className}`}
		>
			{children}
		</span>
	);
}

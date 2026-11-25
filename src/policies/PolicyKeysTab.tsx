import { Link } from "@tanstack/react-router";
import { AlertTriangle, KeyRound, Plus } from "lucide-react";
import type { Policy } from "@/api/types/policy";
import { HostLogo, hostRefLogo } from "@/hosts/HostLogo";
import { cn } from "@/lib/utils";
import {
	type HostKeyState,
	hostLabel,
	KEYLESS_HOST_TEXT,
} from "@/policies/policyReachRows";
import {
	type PolicyHostView,
	usePolicyHostsByKeyState,
} from "@/policies/usePolicyHosts";
import { EmptyPanel } from "@/shared/EmptyPanel";
import { QuietBadge, StatusBadge, WarnBadge } from "@/shared/StatusBadge";
import { Th } from "@/shared/Th";

interface Props {
	policy: Policy;
}

/**
 * Host keys reaching the hosts this policy can serve, resolved server-side via
 * `GET /policies/{ref}/hosts`. Each row is a host the policy's models reach,
 * with the host keys its pools give it. A host with no key is flagged — `required`
 * means requests there will fail; `optional` means a sibling host can cover the
 * same models. All state (host/key enabled, sharing, requirement) is server-fed.
 */
export function PolicyKeysTab({ policy }: Props) {
	const rows = usePolicyHostsByKeyState(policy.metadata.name);
	const policyName = policy.metadata.name;

	if (rows.length === 0) {
		return (
			<EmptyPanel title="Nothing to show" className="mt-2">
				Link pools in the edit form; their host keys show here.
			</EmptyPanel>
		);
	}

	return (
		<div className="flex flex-col gap-3 pt-2">
			<div className="rounded-md border border-border bg-card overflow-hidden">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-border bg-muted/30">
							<Th variant="column">Host</Th>
							<Th variant="column">Credentials</Th>
							<Th variant="column" align="right">
								Status
							</Th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{rows.map(({ row, state }) => (
							<HostRow
								key={row.host.id}
								row={row}
								state={state}
								policyName={policyName}
							/>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

function HostRow({
	row,
	state,
	policyName,
}: {
	row: PolicyHostView;
	state: HostKeyState;
	policyName: string;
}) {
	const keys = row.hostKeys ?? [];

	return (
		<tr
			className={
				state === "breaking"
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
					{row.host.enabled === false && <WarnBadge>host off</WarnBadge>}
				</div>
			</td>
			<td className="px-3 py-2">
				{state === "keyed" ? (
					<ul className="flex flex-wrap gap-x-3 gap-y-1">
						{keys.map((k) => (
							<li key={k.id} className="flex items-center gap-1.5">
								{k.readOnly ? (
									// A shared account's key: it serves, but the share never opens it.
									<span
										className="inline-flex items-center gap-1.5 text-foreground"
										title="Reached through a shared account; its owner manages it."
									>
										<KeyRound
											className="w-3.5 h-3.5 text-muted-foreground shrink-0"
											aria-hidden
										/>
										{k.name}
										<QuietBadge>shared</QuietBadge>
									</span>
								) : (
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
								)}
								{k.enabled === false && <WarnBadge>key off</WarnBadge>}
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
				) : (
					<span
						className={cn(
							"inline-flex items-center gap-1.5 text-[11px]",
							state === "breaking" ? "text-warning" : "text-muted-foreground",
						)}
					>
						<AlertTriangle className="w-3.5 h-3.5" aria-hidden />
						{KEYLESS_HOST_TEXT[state]}
					</span>
				)}
			</td>
			<td className="px-3 py-2 text-right">
				{state === "breaking" ? (
					<Link
						to="/policies/$name/edit"
						params={{ name: policyName }}
						className="inline-flex h-5 items-center gap-1 whitespace-nowrap text-[11px] text-primary hover:underline"
					>
						<Plus className="w-3 h-3" aria-hidden />
						Link a pool
					</Link>
				) : state === "optional" ? (
					<QuietBadge>optional</QuietBadge>
				) : (
					<StatusBadge enabled enabledLabel="reachable" />
				)}
			</td>
		</tr>
	);
}

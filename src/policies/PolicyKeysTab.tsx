import { Link } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { useMemo } from "react";
import { useHostKeys } from "@/api/hooks/hostkeys";
import { useHosts } from "@/api/hooks/hosts";
import type { Host } from "@/api/types/host";
import type { HostKey } from "@/api/types/hostkey";
import type { Policy } from "@/api/types/policy";
import { useDiagnosticGraph } from "@/diagnostics/useDiagnostics";
import { HostLogo } from "@/hosts/HostLogo";
import { displayLabel } from "@/lib/displayLabel";
import { usePolicyHostRequirements } from "@/policies/usePolicyHostRequirements";
import { AlertBanner } from "@/shared/AlertBanner";

interface Props {
	policy: Policy;
}

interface Row {
	key: HostKey;
	host: Host | undefined;
	otherPolicies: number;
}

/**
 * Flat table of every host key attached to this policy. All attached keys
 * are equal — Relay rotates across them. We don't visually rank one as
 * "primary" because that's not how routing works.
 */
export function PolicyKeysTab({ policy }: Props) {
	const { data: hostKeysData } = useHostKeys();
	const { data: hostsData } = useHosts();
	const graph = useDiagnosticGraph();
	const requirements = usePolicyHostRequirements(
		policy.spec.models ?? [],
		policy.spec.hostKeyIds ?? [],
		policy.spec.includeDeprecated ?? false,
	);

	const policyId = policy.metadata.id;
	const attachedIds = policy.spec.hostKeyIds ?? [];

	const rows = useMemo<Row[]>(() => {
		const hostsById = new Map<string, Host>();
		for (const h of hostsData.items ?? []) {
			if (h.metadata.id) hostsById.set(h.metadata.id, h);
		}
		const keysById = new Map<string, HostKey>();
		for (const k of hostKeysData.items ?? []) {
			if (k.metadata.id) keysById.set(k.metadata.id, k);
		}
		const out: Row[] = [];
		for (const id of attachedIds) {
			const key = keysById.get(id);
			if (!key) continue;
			const host = hostsById.get(key.spec.hostId);
			const otherPolicies = (graph.policiesByHostKeyId.get(id) ?? []).filter(
				(p) => (p.metadata.id ?? p.metadata.name) !== policyId,
			).length;
			out.push({ key, host, otherPolicies });
		}
		out.sort((a, b) => {
			const ha = a.host ? displayLabel(a.host.metadata) : "";
			const hb = b.host ? displayLabel(b.host.metadata) : "";
			return (
				ha.localeCompare(hb) ||
				displayLabel(a.key.metadata).localeCompare(displayLabel(b.key.metadata))
			);
		});
		return out;
	}, [attachedIds, hostKeysData, hostsData, graph, policyId]);

	const requiredHostIdsWithoutKey = useMemo(() => {
		const attachedHostIds = new Set<string>();
		for (const r of rows) {
			if (r.host?.metadata.id) attachedHostIds.add(r.host.metadata.id);
		}
		return requirements.groups
			.filter((g) => g.kind === "required")
			.flatMap((g) => g.candidateHostIds)
			.filter((id) => !attachedHostIds.has(id));
	}, [rows, requirements.groups]);

	if (rows.length === 0) {
		return (
			<div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-center mt-2">
				<div className="text-sm font-medium text-foreground">
					No host keys attached
				</div>
				<div className="mt-0.5 text-xs text-muted-foreground">
					Pick models on the Models tab, then attach host keys in the edit form.
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3 pt-2">
			{requiredHostIdsWithoutKey.length > 0 && (
				<GapWarning
					hostIds={requiredHostIdsWithoutKey}
					hosts={requirements.hosts}
				/>
			)}

			<div className="rounded-md border border-border bg-card overflow-hidden">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-border bg-muted/30 text-left">
							<th className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
								Key
							</th>
							<th className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
								Host
							</th>
							<th className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
								Status
							</th>
							<th className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-medium text-right">
								Shared with
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{rows.map((row) => (
							<KeyRow key={row.key.metadata.id} row={row} />
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

function KeyRow({ row }: { row: Row }) {
	const { key, host, otherPolicies } = row;
	const keyEnabled = key.spec.enabled !== false;
	const hostEnabled = host ? host.spec.enabled !== false : false;
	return (
		<tr className="hover:bg-muted/40">
			<td className="px-3 py-2">
				<div className="flex items-center gap-2 min-w-0">
					<KeyRound
						className="w-3.5 h-3.5 text-muted-foreground shrink-0"
						aria-hidden
					/>
					<Link
						to="/host-keys/$name"
						params={{ name: key.metadata.name }}
						className="text-foreground hover:underline truncate"
					>
						{displayLabel(key.metadata)}
					</Link>
				</div>
			</td>
			<td className="px-3 py-2">
				{host ? (
					<div className="flex items-center gap-2 min-w-0">
						<HostLogo host={host} size={16} />
						<span className="text-foreground truncate">
							{displayLabel(host.metadata)}
						</span>
					</div>
				) : (
					<span className="text-[11px] text-destructive">missing host</span>
				)}
			</td>
			<td className="px-3 py-2">
				<div className="flex items-center gap-1.5">
					<StatusPill enabled={keyEnabled} label="key" />
					{host && !hostEnabled && <StatusPill enabled={false} label="host" />}
				</div>
			</td>
			<td className="px-3 py-2 text-right text-[11px] text-muted-foreground tabular-nums">
				{otherPolicies === 0
					? "—"
					: `${otherPolicies} other polic${otherPolicies === 1 ? "y" : "ies"}`}
			</td>
		</tr>
	);
}

function StatusPill({ enabled, label }: { enabled: boolean; label: string }) {
	if (enabled) {
		return (
			<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60 whitespace-nowrap">
				{label} on
			</span>
		);
	}
	return (
		<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/60 whitespace-nowrap">
			{label} off
		</span>
	);
}

function GapWarning({
	hostIds,
	hosts,
}: {
	hostIds: string[];
	hosts: Map<string, { host: Host }>;
}) {
	const labels = hostIds
		.map((id) => hosts.get(id)?.host)
		.filter((h): h is Host => !!h)
		.map((h) => displayLabel(h.metadata));
	if (labels.length === 0) return null;
	return (
		<AlertBanner severity="warn">
			No key attached for required host
			{labels.length === 1 ? "" : "s"}: {labels.join(", ")}. Models routed there
			will fail until you attach a key.
		</AlertBanner>
	);
}

import { CheckCircle2, Circle } from "lucide-react";
import { useHostKeys } from "@/api/hooks/hostkeys";
import { useHosts } from "@/api/hooks/hosts";
import type { Host } from "@/api/types/host";
import type { HostKey } from "@/api/types/hostkey";
import type { Policy } from "@/api/types/policy";
import { HostLogo } from "@/hosts/HostLogo";
import { displayLabel } from "@/lib/displayLabel";
import { usePolicyHostRequirements } from "@/policies/usePolicyHostRequirements";

interface Props {
	policy: Policy;
}

/**
 * Read-only view of the policy's host-key configuration. Mirrors
 * PolicyHostRequirements but renders the *current* selection — no editing.
 */
export function PolicyKeysTab({ policy }: Props) {
	const requirements = usePolicyHostRequirements(
		policy.spec.models ?? [],
		policy.spec.hostKeyIds ?? [],
		policy.spec.includeDeprecated ?? false,
	);
	const { data: hostKeysData } = useHostKeys();
	const { data: hostsData } = useHosts();

	const allHostKeys = hostKeysData.items ?? [];
	const hostsById = new Map<string, Host>();
	for (const h of hostsData.items ?? []) {
		if (h.metadata.id) hostsById.set(h.metadata.id, h);
	}

	const selectedKeyIds = new Set(policy.spec.hostKeyIds ?? []);
	const selectedKeys = allHostKeys.filter((k) =>
		k.metadata.id ? selectedKeyIds.has(k.metadata.id) : false,
	);

	const requiredHostIds = new Set(
		requirements.groups
			.filter((g) => g.kind === "required")
			.flatMap((g) => g.candidateHostIds),
	);
	const optionalGroups = requirements.groups.filter(
		(g) => g.kind === "optional",
	);

	return (
		<div className="flex flex-col gap-6 pt-2">
			{requiredHostIds.size > 0 && (
				<Section title="Required hosts">
					<div className="divide-y divide-border rounded-md border border-border">
						{Array.from(requiredHostIds).map((id) => {
							const req = requirements.hosts.get(id);
							if (!req) return null;
							return (
								<HostRow
									key={id}
									host={req.host}
									hostKeys={req.hostKeys}
									selectedKeyId={req.selectedKeyId}
								/>
							);
						})}
					</div>
				</Section>
			)}

			{optionalGroups.map((g) => (
				<Section
					key={g.ref}
					title={
						<span className="font-mono text-foreground">{g.ref}</span>
					}
					hint="One key from any candidate satisfies this ref."
				>
					<div className="divide-y divide-border rounded-md border border-border">
						{g.candidateHostIds.map((id) => {
							const req = requirements.hosts.get(id);
							if (!req) return null;
							return (
								<HostRow
									key={id}
									host={req.host}
									hostKeys={req.hostKeys}
									selectedKeyId={req.selectedKeyId}
								/>
							);
						})}
					</div>
				</Section>
			))}

			{requirements.extraSelectedKeyIds.length > 0 && (
				<Section
					title="Additional keys"
					hint="Attached beyond what the catalog refs imply — Relay still uses them in rotation."
				>
					<ul className="divide-y divide-border rounded-md border border-border">
						{requirements.extraSelectedKeyIds.map((keyId) => {
							const key = selectedKeys.find((k) => k.metadata.id === keyId);
							if (!key) return null;
							const host = hostsById.get(key.spec.hostId);
							return (
								<li
									key={keyId}
									className="flex items-center gap-3 px-3 py-2 text-sm"
								>
									{host ? (
										<HostLogo host={host} size={20} />
									) : (
										<div className="w-5 h-5 rounded bg-muted" aria-hidden />
									)}
									<div className="flex-1 min-w-0">
										<div className="text-foreground truncate">
											{displayLabel(key.metadata)}
										</div>
										<div className="text-[11px] text-muted-foreground truncate">
											{host ? displayLabel(host.metadata) : "unknown host"}
										</div>
									</div>
								</li>
							);
						})}
					</ul>
				</Section>
			)}

			{requiredHostIds.size === 0 && optionalGroups.length === 0 && (
				<div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
					<div className="text-sm font-medium text-foreground">
						Nothing to attach
					</div>
					<div className="mt-0.5 text-xs text-muted-foreground">
						Pick models on the Models tab and Relay will list which hosts need
						keys.
					</div>
				</div>
			)}
		</div>
	);
}

function HostRow({
	host,
	hostKeys,
	selectedKeyId,
}: {
	host: Host;
	hostKeys: HostKey[];
	selectedKeyId: string | undefined;
}) {
	const selectedKey = hostKeys.find((k) => k.metadata.id === selectedKeyId);
	const satisfied = !!selectedKey;
	return (
		<div className="flex items-center gap-3 px-3 py-2">
			<HostLogo host={host} size={20} />
			<div className="flex-1 min-w-0">
				<div className="text-sm text-foreground truncate">
					{displayLabel(host.metadata)}
				</div>
				<div className="text-[11px] text-muted-foreground truncate">
					{selectedKey
						? `Key: ${displayLabel(selectedKey.metadata)}`
						: hostKeys.length > 0
							? `No key selected (${hostKeys.length} available)`
							: "No keys for this host"}
				</div>
			</div>
			{satisfied ? (
				<CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
			) : (
				<Circle className="h-4 w-4 text-muted-foreground" aria-hidden />
			)}
		</div>
	);
}

function Section({
	title,
	hint,
	children,
}: {
	title: React.ReactNode;
	hint?: string;
	children: React.ReactNode;
}) {
	return (
		<div>
			<div className="mb-1.5">
				<div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
					{title}
				</div>
				{hint && (
					<div className="text-[11px] text-muted-foreground">{hint}</div>
				)}
			</div>
			{children}
		</div>
	);
}

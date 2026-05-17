import { Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, KeyRound } from "lucide-react";
import { useHostKeys } from "@/api/hooks/hostkeys";
import { useHosts } from "@/api/hooks/hosts";
import type { Host } from "@/api/types/host";
import type { HostKey } from "@/api/types/hostkey";
import type { Policy } from "@/api/types/policy";
import { useDiagnosticGraph } from "@/diagnostics/useDiagnostics";
import { HostLogo } from "@/hosts/HostLogo";
import { parseCatalogRef, validateCatalogRef } from "@/lib/catalogRef";
import { displayLabel } from "@/lib/displayLabel";
import { usePolicyHostRequirements } from "@/policies/usePolicyHostRequirements";

interface Props {
	policy: Policy;
}

/**
 * Per-host detail view. Each host card shows host status, selected key
 * status, alternative keys defined for the same host, and how many other
 * policies reuse the selected key.
 */
export function PolicyKeysTab({ policy }: Props) {
	const requirements = usePolicyHostRequirements(
		policy.spec.models ?? [],
		policy.spec.hostKeyIds ?? [],
		policy.spec.includeDeprecated ?? false,
	);
	const { data: hostKeysData } = useHostKeys();
	const { data: hostsData } = useHosts();
	const graph = useDiagnosticGraph();

	const allHostKeys = hostKeysData.items ?? [];
	const hostsById = new Map<string, Host>();
	for (const h of hostsData.items ?? []) {
		if (h.metadata.id) hostsById.set(h.metadata.id, h);
	}

	const selectedKeyIds = new Set(policy.spec.hostKeyIds ?? []);
	const selectedKeys = allHostKeys.filter((k) =>
		k.metadata.id ? selectedKeyIds.has(k.metadata.id) : false,
	);

	const policyId = policy.metadata.id;

	const requiredHostIds = new Set(
		requirements.groups
			.filter((g) => g.kind === "required")
			.flatMap((g) => g.candidateHostIds),
	);
	const optionalGroups = requirements.groups.filter(
		(g) => g.kind === "optional",
	);

	if (requiredHostIds.size === 0 && optionalGroups.length === 0) {
		return (
			<div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-center mt-2">
				<div className="text-sm font-medium text-foreground">
					Nothing to attach
				</div>
				<div className="mt-0.5 text-xs text-muted-foreground">
					Pick models on the Models tab and Relay will list which hosts need
					keys.
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6 pt-2">
			{requiredHostIds.size > 0 && (
				<Section title="Required hosts">
					<div className="flex flex-col gap-3">
						{Array.from(requiredHostIds).map((id) => {
							const req = requirements.hosts.get(id);
							if (!req) return null;
							return (
								<HostCard
									key={id}
									host={req.host}
									hostKeys={req.hostKeys}
									selectedKeyId={req.selectedKeyId}
									graph={graph}
									currentPolicyId={policyId}
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
						<span className="text-foreground normal-case font-medium">
							{describeOptionalRef(g.ref)}{" "}
							<code className="ml-1 font-mono text-[10px] text-muted-foreground">
								{g.ref}
							</code>
						</span>
					}
					hint="These models route through more than one host. Set up a key on any one of them — Relay will use whichever has keys."
				>
					<div className="flex flex-col gap-3">
						{g.candidateHostIds.map((id) => {
							const req = requirements.hosts.get(id);
							if (!req) return null;
							return (
								<HostCard
									key={id}
									host={req.host}
									hostKeys={req.hostKeys}
									selectedKeyId={req.selectedKeyId}
									graph={graph}
									currentPolicyId={policyId}
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
		</div>
	);
}

interface HostCardProps {
	host: Host;
	hostKeys: HostKey[];
	selectedKeyId: string | undefined;
	graph: ReturnType<typeof useDiagnosticGraph>;
	currentPolicyId: string | undefined;
}

function HostCard({
	host,
	hostKeys,
	selectedKeyId,
	graph,
	currentPolicyId,
}: HostCardProps) {
	const hostEnabled = host.spec.enabled !== false;
	const selectedKey = hostKeys.find((k) => k.metadata.id === selectedKeyId);
	const selectedKeyEnabled = selectedKey
		? selectedKey.spec.enabled !== false
		: false;
	const alternativeKeys = hostKeys.filter(
		(k) => k.metadata.id !== selectedKeyId,
	);
	const satisfied = !!selectedKey && selectedKeyEnabled && hostEnabled;

	// Cross-policy usage of the selected key.
	const otherPoliciesCount =
		selectedKey && selectedKey.metadata.id
			? (graph.policiesByHostKeyId.get(selectedKey.metadata.id) ?? []).filter(
					(p) => (p.metadata.id ?? p.metadata.name) !== currentPolicyId,
				).length
			: 0;

	return (
		<article className="rounded-md border border-border bg-card overflow-hidden">
			<header className="flex items-center gap-3 px-3 py-2 border-b border-border bg-muted/30">
				<HostLogo host={host} size={20} />
				<div className="flex-1 min-w-0">
					<Link
						to="/host-keys"
						className="text-sm font-medium text-foreground hover:underline truncate"
					>
						{displayLabel(host.metadata)}
					</Link>
					<div className="text-[11px] text-muted-foreground truncate font-mono">
						{host.metadata.name}
					</div>
				</div>
				<HealthBadge enabled={hostEnabled} label="host" />
				{satisfied ? (
					<CheckCircle2
						className="h-4 w-4 text-emerald-500"
						aria-label="satisfied"
					/>
				) : (
					<Circle
						className="h-4 w-4 text-amber-500"
						aria-label="not satisfied"
					/>
				)}
			</header>

			<div className="px-3 py-2 flex flex-col gap-2">
				<div className="flex items-center gap-3">
					<div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground w-20 shrink-0">
						Selected
					</div>
					<div className="flex-1 min-w-0">
						{selectedKey ? (
							<div className="flex items-center gap-2 min-w-0">
								<KeyRound
									className="w-3.5 h-3.5 text-muted-foreground shrink-0"
									aria-hidden
								/>
								<Link
									to="/host-keys/$name"
									params={{ name: selectedKey.metadata.name }}
									className="text-sm text-foreground truncate hover:underline"
								>
									{displayLabel(selectedKey.metadata)}
								</Link>
								<HealthBadge enabled={selectedKeyEnabled} label="key" />
								{otherPoliciesCount > 0 && (
									<span className="ml-auto text-[11px] text-muted-foreground whitespace-nowrap">
										also used by {otherPoliciesCount}{" "}
										other polic{otherPoliciesCount === 1 ? "y" : "ies"}
									</span>
								)}
							</div>
						) : hostKeys.length > 0 ? (
							<div className="text-[11px] text-amber-600 dark:text-amber-400">
								No key selected — pick one of the {hostKeys.length} available
								below in edit.
							</div>
						) : (
							<div className="text-[11px] text-amber-600 dark:text-amber-400">
								No keys for this host. Create one before enabling the policy.
							</div>
						)}
					</div>
				</div>

				{alternativeKeys.length > 0 && (
					<div className="flex items-start gap-3">
						<div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground w-20 shrink-0 mt-1">
							Alternatives
						</div>
						<ul className="flex-1 flex flex-col gap-1 min-w-0">
							{alternativeKeys.map((k) => (
								<li
									key={k.metadata.id}
									className="flex items-center gap-2 text-[12px] min-w-0"
								>
									<KeyRound
										className="w-3 h-3 text-muted-foreground/70 shrink-0"
										aria-hidden
									/>
									<Link
										to="/host-keys/$name"
										params={{ name: k.metadata.name }}
										className="text-muted-foreground truncate hover:text-foreground hover:underline"
									>
										{displayLabel(k.metadata)}
									</Link>
									<HealthBadge
										enabled={k.spec.enabled !== false}
										label="key"
										subtle
									/>
								</li>
							))}
						</ul>
					</div>
				)}
			</div>
		</article>
	);
}

function HealthBadge({
	enabled,
	label,
	subtle,
}: {
	enabled: boolean;
	label: string;
	subtle?: boolean;
}) {
	const base =
		"inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap";
	if (enabled) {
		return (
			<span
				className={`${base} ${
					subtle
						? "bg-transparent text-muted-foreground border-transparent"
						: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/60"
				}`}
			>
				{label} on
			</span>
		);
	}
	return (
		<span
			className={`${base} bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200/60 dark:border-amber-900/60`}
		>
			{label} off
		</span>
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

/**
 * Plain-English label for a model-level ref that resolves to multiple hosts.
 * The raw ref string is shown next to it for operators who use the DSL.
 */
function describeOptionalRef(raw: string): string {
	if (validateCatalogRef(raw)) return raw;
	const r = parseCatalogRef(raw);
	const capitalize = (s: string) =>
		s.charAt(0).toUpperCase() + s.slice(1);
	switch (r.kind) {
		case "provider":
			return `All ${capitalize(r.provider ?? "")} models`;
		case "model":
			return `Model ${r.model}`;
		default:
			return raw;
	}
}

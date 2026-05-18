import { Link } from "@tanstack/react-router";
import {
	Activity,
	Boxes,
	ExternalLink,
	KeyRound,
	LayoutGrid,
	Power,
	ScrollText,
	ShieldCheck,
	Sliders,
	Users,
} from "lucide-react";
import { useMemo } from "react";
import type { Host } from "@/api/types/host";
import type { HostKey } from "@/api/types/hostkey";
import type { Model } from "@/api/types/model";
import type { Policy } from "@/api/types/policy";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DiagnosticList } from "@/diagnostics/DiagnosticList";
import { useHostDiagnostics } from "@/diagnostics/useDiagnostics";
import { HostLogo } from "@/hosts/HostLogo";
import { useHostReferences } from "@/hosts/useHostReferences";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";

export type HostDetailTab =
	| "overview"
	| "configuration"
	| "host-policies"
	| "user-policies"
	| "host-keys"
	| "models"
	| "usage"
	| "logs";

interface Props {
	host: Host;
	tab: HostDetailTab;
	onTabChange: (next: HostDetailTab) => void;
	onToggleEnabled: () => void;
	toggling?: boolean;
}

const TABS: {
	value: HostDetailTab;
	label: string;
	icon: typeof LayoutGrid;
}[] = [
	{ value: "overview", label: "Overview", icon: LayoutGrid },
	{ value: "configuration", label: "Configuration", icon: Sliders },
	{ value: "host-policies", label: "Host policies", icon: ShieldCheck },
	{ value: "user-policies", label: "User policies", icon: Users },
	{ value: "host-keys", label: "Host keys", icon: KeyRound },
	{ value: "models", label: "Models", icon: Boxes },
	{ value: "usage", label: "Usage", icon: Activity },
	{ value: "logs", label: "Logs", icon: ScrollText },
];

export function HostDetailView({
	host,
	tab,
	onTabChange,
	onToggleEnabled,
	toggling,
}: Props) {
	const refs = useHostReferences(host);

	return (
		<div className="flex flex-col gap-5">
			<Header
				host={host}
				onToggleEnabled={onToggleEnabled}
				toggling={toggling}
			/>

			<Tabs
				value={tab}
				onValueChange={(v) => onTabChange((v ?? "overview") as HostDetailTab)}
			>
				<TabsList variant="underline">
					{TABS.map(({ value, label, icon: Icon }) => (
						<TabsTrigger key={value} value={value} className="px-3 h-9">
							<Icon className="w-3.5 h-3.5" aria-hidden />
							{label}
						</TabsTrigger>
					))}
				</TabsList>

				<TabsContent value="overview">
					<OverviewTab host={host} refs={refs} />
				</TabsContent>
				<TabsContent value="configuration">
					<ConfigurationTab host={host} />
				</TabsContent>
				<TabsContent value="host-policies">
					<HostPoliciesTable
						host={host}
						policies={refs.hostPolicies}
						hostKeys={refs.hostKeys}
					/>
				</TabsContent>
				<TabsContent value="user-policies">
					<UserPoliciesTable rows={refs.userPolicies} />
				</TabsContent>
				<TabsContent value="host-keys">
					<HostKeysTable
						hostKeys={refs.hostKeys}
						hostPolicies={refs.hostPolicies}
					/>
				</TabsContent>
				<TabsContent value="models">
					<ModelsTable models={refs.models} />
				</TabsContent>
				<TabsContent value="usage">
					<ComingSoon
						icon={Activity}
						title="Usage"
						body="Per-host request volume, latency percentiles, and throttle rate. Pending the /admin/metrics endpoint."
					/>
				</TabsContent>
				<TabsContent value="logs">
					<ComingSoon
						icon={ScrollText}
						title="Logs"
						body="Recent requests routed through this host with status, latency, and host key used."
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}

/* ---------------- Header ---------------- */

function Header({
	host,
	onToggleEnabled,
	toggling,
}: {
	host: Host;
	onToggleEnabled: () => void;
	toggling?: boolean;
}) {
	const enabled = host.spec.enabled !== false;
	const system = host.metadata.owner?.kind === "system";
	const canMutate = !system;

	const links: { href: string | undefined; label: string }[] = [
		{ href: host.spec.consoleURL, label: "Console" },
		{ href: host.spec.docsURL, label: "Docs" },
		{ href: host.spec.homepageURL, label: "Homepage" },
		{ href: host.spec.statusPageURL, label: "Status" },
	];
	const activeLinks = links.filter((l) => l.href);

	return (
		<div className="flex items-start justify-between gap-4">
			<div className="min-w-0 flex items-start gap-3">
				<HostLogo host={host} size={44} className="mt-0.5 shrink-0" />
				<div className="min-w-0">
					<h1 className="text-xl font-semibold text-foreground truncate flex items-center gap-2">
						{displayLabel(host.metadata)}
						{!hasDisplayName(host.metadata) && (
							<span className="text-[11px] text-muted-foreground font-normal">
								(no display name)
							</span>
						)}
						<StatusBadge enabled={enabled} />
						{system && <OwnerBadge label="System" />}
					</h1>
					<p className="mt-1 text-xs text-muted-foreground font-mono truncate">
						{host.metadata.name}
					</p>
					{host.metadata.description && (
						<p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
							{host.metadata.description}
						</p>
					)}
					{activeLinks.length > 0 && (
						<ul className="mt-2 flex flex-wrap gap-1.5">
							{activeLinks.map((l) => (
								<li key={l.label}>
									<a
										href={l.href}
										target="_blank"
										rel="noreferrer noopener"
										className="inline-flex items-center gap-1 h-6 px-2 rounded-md border border-border bg-card text-[11px] text-foreground hover:bg-muted transition-colors"
									>
										{l.label}
										<ExternalLink className="w-2.5 h-2.5 opacity-60" />
									</a>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
			<div className="flex items-center gap-2 shrink-0">
				{canMutate && (
					<button
						type="button"
						onClick={onToggleEnabled}
						disabled={toggling}
						className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-foreground border border-border hover:bg-muted disabled:opacity-50 transition-colors"
					>
						<Power className="w-3.5 h-3.5" />
						{enabled ? "Disable" : "Enable"}
					</button>
				)}
			</div>
		</div>
	);
}

/* ---------------- Overview ---------------- */

function OverviewTab({
	host,
	refs,
}: {
	host: Host;
	refs: ReturnType<typeof useHostReferences>;
}) {
	const enabledModels = refs.models.filter((m) =>
		(m.spec.hosts ?? []).some(
			(b) => b.hostId === host.metadata.id && b.enabled !== false,
		),
	).length;
	const enabledHostKeys = refs.hostKeys.filter(
		(hk) => hk.spec.enabled !== false,
	).length;

	return (
		<div className="flex flex-col gap-6 pt-2">
			<IssuesPanel hostId={host.metadata.id} />
			<section>
				<div className="mb-2 flex items-baseline justify-between gap-2">
					<SectionTitle>Overview</SectionTitle>
					<span className="text-[10px] uppercase tracking-wide text-muted-foreground">
						usage is mock data
					</span>
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
					<StatCard
						label="Models"
						value={refs.models.length}
						sub={`${enabledModels} enabled`}
					/>
					<StatCard
						label="Host keys"
						value={refs.hostKeys.length}
						sub={`${enabledHostKeys} enabled`}
					/>
					<StatCard
						label="Host policies"
						value={refs.hostPolicies.length}
						sub={refs.hostPolicies.length === 0 ? "no tiers" : "tier caps"}
					/>
					<StatCard
						label="User policies"
						value={refs.userPolicies.length}
						sub={
							refs.userPolicies.length === 0
								? "unused"
								: `${refs.totalRelayKeys} relay key${refs.totalRelayKeys === 1 ? "" : "s"}`
						}
					/>
					<StatCard
						label="Requests · 24h"
						value={MOCK.requests24h.toLocaleString()}
						sub="mock"
						mono
					/>
					<StatCard
						label="Error rate"
						value={`${(MOCK.errorRate * 100).toFixed(2)}%`}
						sub="mock"
						mono
					/>
					<StatCard
						label="p95 latency"
						value={`${MOCK.p95Ms} ms`}
						sub="mock"
						mono
					/>
					<StatCard
						label="Throttle rate"
						value={`${(MOCK.throttleRate * 100).toFixed(2)}%`}
						sub="mock"
						mono
					/>
				</div>
			</section>
		</div>
	);
}

function IssuesPanel({ hostId }: { hostId: string | undefined }) {
	const diagnostics = useHostDiagnostics(hostId);
	if (diagnostics.length === 0) return null;
	const counts = {
		error: diagnostics.filter((d) => d.severity === "error").length,
		warn: diagnostics.filter((d) => d.severity === "warn").length,
		info: diagnostics.filter((d) => d.severity === "info").length,
	};
	const summary = [
		counts.error && `${counts.error} error${counts.error === 1 ? "" : "s"}`,
		counts.warn && `${counts.warn} warning${counts.warn === 1 ? "" : "s"}`,
		counts.info && `${counts.info} info`,
	]
		.filter(Boolean)
		.join(" · ");
	return (
		<section>
			<div className="mb-2 flex items-baseline justify-between gap-2">
				<SectionTitle>Issues</SectionTitle>
				<span className="text-[10px] text-muted-foreground tabular-nums">
					{summary}
				</span>
			</div>
			<DiagnosticList diagnostics={diagnostics} />
		</section>
	);
}

const MOCK = {
	requests24h: 24_127,
	errorRate: 0.008,
	p95Ms: 412,
	throttleRate: 0.012,
};

/* ---------------- Configuration ---------------- */

function ConfigurationTab({ host }: { host: Host }) {
	const backendEntries = Object.entries(host.spec.backend ?? {});
	const defaultPolicySlug = host.spec.defaultPolicy?.trim() || undefined;

	return (
		<div className="flex flex-col gap-4 pt-2">
			<Card title="Connection" icon={Sliders}>
				<dl className="divide-y divide-border">
					<Row label="Base URL">
						{host.spec.baseURL ? (
							<code className="font-mono text-xs text-foreground break-all">
								{host.spec.baseURL}
							</code>
						) : (
							<span className="text-muted-foreground">—</span>
						)}
					</Row>
					<Row label="Default policy">
						{defaultPolicySlug ? (
							<Link
								to="/policies/$name"
								params={{ name: defaultPolicySlug }}
								className="font-mono text-xs text-primary hover:underline"
							>
								{defaultPolicySlug}
							</Link>
						) : (
							<span className="text-muted-foreground">— (none set)</span>
						)}
						<p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">
							Used when a host key on this host doesn't specify its own host
							policy.
						</p>
					</Row>
				</dl>
			</Card>

			<Card title="External links" icon={ExternalLink}>
				<dl className="divide-y divide-border">
					<UrlRow label="Console" url={host.spec.consoleURL} />
					<UrlRow label="Docs" url={host.spec.docsURL} />
					<UrlRow label="Homepage" url={host.spec.homepageURL} />
					<UrlRow label="Status page" url={host.spec.statusPageURL} />
				</dl>
			</Card>

			<Card title="Backend config" icon={Sliders}>
				{backendEntries.length === 0 ? (
					<p className="text-xs text-muted-foreground">
						No provider-specific backend settings.
					</p>
				) : (
					<dl className="divide-y divide-border">
						{backendEntries.map(([k, v]) => (
							<Row key={k} label={k}>
								<code className="font-mono text-xs text-foreground break-all">
									{v}
								</code>
							</Row>
						))}
					</dl>
				)}
			</Card>
		</div>
	);
}

function UrlRow({ label, url }: { label: string; url: string | undefined }) {
	return (
		<Row label={label}>
			{url ? (
				<a
					href={url}
					target="_blank"
					rel="noreferrer noopener"
					className="inline-flex items-center gap-1 text-xs text-primary hover:underline break-all"
				>
					{url}
					<ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
				</a>
			) : (
				<span className="text-muted-foreground">—</span>
			)}
		</Row>
	);
}

/* ---------------- Host policies ---------------- */

function HostPoliciesTable({
	host,
	policies,
	hostKeys,
}: {
	host: Host;
	policies: Policy[];
	hostKeys: HostKey[];
}) {
	const defaultSlug = host.spec.defaultPolicy?.trim() || undefined;
	const hkCountByPolicy = useMemo(() => {
		const m = new Map<string, number>();
		for (const hk of hostKeys) {
			const pid = hk.spec.policyId;
			if (!pid) continue;
			m.set(pid, (m.get(pid) ?? 0) + 1);
		}
		return m;
	}, [hostKeys]);

	if (policies.length === 0) {
		return (
			<EmptyState
				icon={ShieldCheck}
				title="No host policies"
				body="This host has no host-owned policies (tiers). Host keys will use the host's default policy if set."
			/>
		);
	}

	return (
		<div className="mt-2 rounded-md border border-border bg-card overflow-hidden">
			<table className="w-full text-sm">
				<thead className="bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground">
					<tr>
						<Th>Policy</Th>
						<Th className="text-right">Host keys</Th>
						<Th className="text-right">Default</Th>
						<Th className="text-right">Status</Th>
					</tr>
				</thead>
				<tbody className="divide-y divide-border">
					{policies.map((p) => {
						const enabled = p.spec.enabled !== false;
						const isDefault = p.metadata.name === defaultSlug;
						const hkCount = p.metadata.id
							? (hkCountByPolicy.get(p.metadata.id) ?? 0)
							: 0;
						return (
							<tr
								key={p.metadata.name}
								className="hover:bg-muted/30 transition-colors"
							>
								<Td>
									<Link
										to="/policies/$name"
										params={{ name: p.metadata.name }}
										className="text-foreground hover:underline font-medium"
									>
										{displayLabel(p.metadata)}
									</Link>
									<div className="text-[11px] text-muted-foreground font-mono truncate">
										{p.metadata.name}
									</div>
								</Td>
								<Td className="text-right tabular-nums">
									<span
										className={
											hkCount === 0
												? "text-muted-foreground"
												: "text-foreground"
										}
									>
										{hkCount}
									</span>
								</Td>
								<Td className="text-right">
									{isDefault ? (
										<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/30">
											Default
										</span>
									) : (
										<span className="text-muted-foreground">—</span>
									)}
								</Td>
								<Td className="text-right">
									<StatusInline enabled={enabled} />
								</Td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

/* ---------------- User policies ---------------- */

function UserPoliciesTable({
	rows,
}: {
	rows: ReturnType<typeof useHostReferences>["userPolicies"];
}) {
	if (rows.length === 0) {
		return (
			<EmptyState
				icon={Users}
				title="No user policies reach this host"
				body="Attach one of this host's keys to a user policy's host-key pool to start routing through this host."
			/>
		);
	}
	return (
		<div className="mt-2 rounded-md border border-border bg-card overflow-hidden">
			<table className="w-full text-sm">
				<thead className="bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground">
					<tr>
						<Th>Policy</Th>
						<Th className="text-right">Host keys</Th>
						<Th className="text-right">Relay keys</Th>
						<Th className="text-right">Status</Th>
					</tr>
				</thead>
				<tbody className="divide-y divide-border">
					{rows.map(({ policy: p, hostKeyCount, relayKeyCount }) => {
						const enabled = p.spec.enabled !== false;
						return (
							<tr
								key={p.metadata.name}
								className="hover:bg-muted/30 transition-colors"
							>
								<Td>
									<Link
										to="/policies/$name"
										params={{ name: p.metadata.name }}
										className="text-foreground hover:underline font-medium"
									>
										{displayLabel(p.metadata)}
									</Link>
									<div className="text-[11px] text-muted-foreground font-mono truncate">
										{p.metadata.name}
									</div>
								</Td>
								<Td className="text-right tabular-nums">
									<span className="text-foreground">{hostKeyCount}</span>
								</Td>
								<Td className="text-right tabular-nums">
									<span
										className={
											relayKeyCount === 0
												? "text-muted-foreground"
												: "text-foreground"
										}
									>
										{relayKeyCount}
									</span>
								</Td>
								<Td className="text-right">
									<StatusInline enabled={enabled} />
								</Td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

/* ---------------- Host keys ---------------- */

function HostKeysTable({
	hostKeys,
	hostPolicies,
}: {
	hostKeys: HostKey[];
	hostPolicies: Policy[];
}) {
	const policyLabel = useMemo(() => {
		const m = new Map<string, string>();
		for (const p of hostPolicies) {
			if (p.metadata.id) m.set(p.metadata.id, displayLabel(p.metadata));
		}
		return m;
	}, [hostPolicies]);

	if (hostKeys.length === 0) {
		return (
			<EmptyState
				icon={KeyRound}
				title="No host keys yet"
				body="Register an upstream credential to make this host live."
			/>
		);
	}

	return (
		<div className="mt-2 rounded-md border border-border bg-card overflow-hidden">
			<table className="w-full text-sm">
				<thead className="bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground">
					<tr>
						<Th>Name</Th>
						<Th>Source</Th>
						<Th>Host policy</Th>
						<Th className="text-right">Used by</Th>
						<Th className="text-right">Status</Th>
					</tr>
				</thead>
				<tbody className="divide-y divide-border">
					{hostKeys.map((hk) => {
						const enabled = hk.spec.enabled !== false;
						const stored = hk.spec.valueFrom.kind === "stored";
						const used = hk.policies?.length ?? 0;
						const tier = hk.spec.policyId
							? policyLabel.get(hk.spec.policyId)
							: undefined;
						return (
							<tr
								key={hk.metadata.name}
								className="hover:bg-muted/30 transition-colors"
							>
								<Td>
									<Link
										to="/host-keys/$name"
										params={{ name: hk.metadata.name }}
										className="text-foreground hover:underline font-medium"
									>
										{displayLabel(hk.metadata)}
									</Link>
									<div className="text-[11px] text-muted-foreground font-mono truncate">
										{hk.metadata.name}
									</div>
								</Td>
								<Td>
									{stored ? (
										<span className="text-foreground text-xs">Stored</span>
									) : (
										<span className="flex items-center gap-1 text-xs">
											<span className="text-foreground">Env</span>
											{hk.spec.valueFrom.env && (
												<code className="font-mono text-muted-foreground">
													${hk.spec.valueFrom.env}
												</code>
											)}
										</span>
									)}
								</Td>
								<Td>
									{tier ? (
										<span className="text-xs text-foreground">{tier}</span>
									) : (
										<span className="text-xs text-muted-foreground">—</span>
									)}
								</Td>
								<Td className="text-right tabular-nums">
									<span
										className={
											used === 0 ? "text-muted-foreground" : "text-foreground"
										}
									>
										{used}
									</span>
								</Td>
								<Td className="text-right">
									<StatusInline enabled={enabled} />
								</Td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

/* ---------------- Models ---------------- */

function ModelsTable({ models }: { models: Model[] }) {
	const grouped = useMemo(() => groupByFamily(models), [models]);

	if (models.length === 0) {
		return (
			<EmptyState
				icon={Boxes}
				title="No models on this host"
				body="Models are typically synced from upstream. None resolve to this host yet."
			/>
		);
	}

	return (
		<div className="mt-2 flex flex-col gap-3">
			<div className="flex items-baseline justify-between gap-2">
				<span className="text-[10px] uppercase tracking-wide text-muted-foreground">
					{models.length} model{models.length === 1 ? "" : "s"} ·{" "}
					{grouped.length} famil{grouped.length === 1 ? "y" : "ies"}
				</span>
			</div>
			<div className="rounded-md border border-border bg-card overflow-hidden">
				<ul className="divide-y divide-border">
					{grouped.map((g) => (
						<li key={g.family}>
							<div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/20 border-b border-border">
								<span className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
									{g.family}
								</span>
								<span className="text-[10px] text-muted-foreground tabular-nums">
									{g.models.length}
								</span>
							</div>
							<ul className="divide-y divide-border">
								{g.models.map((m) => (
									<li
										key={m.metadata.name}
										className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-muted/30"
									>
										<Link
											to="/models/$name"
											params={{ name: m.metadata.name }}
											className="text-sm text-foreground hover:underline truncate"
										>
											{displayLabel(m.metadata)}
										</Link>
										<code className="font-mono text-[10px] text-muted-foreground truncate">
											{m.metadata.name}
										</code>
									</li>
								))}
							</ul>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}

interface ModelFamilyGroup {
	family: string;
	models: Model[];
}

function groupByFamily(models: readonly Model[]): ModelFamilyGroup[] {
	const map = new Map<string, Model[]>();
	for (const m of models) {
		const family = m.spec.family?.trim() || "Other";
		const arr = map.get(family) ?? [];
		arr.push(m);
		map.set(family, arr);
	}
	const out: ModelFamilyGroup[] = [];
	for (const [family, ms] of map.entries()) {
		ms.sort((a, b) =>
			displayLabel(a.metadata).localeCompare(displayLabel(b.metadata)),
		);
		out.push({ family, models: ms });
	}
	out.sort((a, b) => b.models.length - a.models.length);
	return out;
}

/* ---------------- Shared sub-components ---------------- */

function Card({
	title,
	icon: Icon,
	children,
}: {
	title: string;
	icon: typeof LayoutGrid;
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

function Th({
	children,
	className = "",
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<th
			scope="col"
			className={`px-3 py-1.5 text-left font-medium ${className}`}
		>
			{children}
		</th>
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

function StatusInline({ enabled }: { enabled: boolean }) {
	return enabled ? (
		<span className="text-[11px] text-emerald-700 dark:text-emerald-400">
			Enabled
		</span>
	) : (
		<span className="text-[11px] text-muted-foreground">Disabled</span>
	);
}

function StatusBadge({ enabled }: { enabled: boolean }) {
	return enabled ? (
		<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60">
			Enabled
		</span>
	) : (
		<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
			Disabled
		</span>
	);
}

function OwnerBadge({ label }: { label: string }) {
	return (
		<span
			className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border"
			title={`${label}-managed.`}
		>
			{label}-owned
		</span>
	);
}

function StatCard({
	label,
	value,
	sub,
	mono,
}: {
	label: string;
	value: string | number;
	sub?: string;
	mono?: boolean;
}) {
	return (
		<div className="rounded-md border border-border bg-card px-3 py-2">
			<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</div>
			<div
				className={`mt-0.5 text-lg font-semibold text-foreground tabular-nums ${mono ? "font-mono text-base" : ""}`}
			>
				{value}
			</div>
			{sub && (
				<div className="text-[11px] text-muted-foreground mt-0.5 truncate">
					{sub}
				</div>
			)}
		</div>
	);
}

function SectionTitle({ children }: { children: React.ReactNode }) {
	return (
		<h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
			{children}
		</h2>
	);
}

function EmptyState({
	icon: Icon,
	title,
	body,
}: {
	icon: typeof LayoutGrid;
	title: string;
	body: string;
}) {
	return (
		<div className="mt-4 rounded-md border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
			<Icon
				className="mx-auto w-6 h-6 text-muted-foreground/60 mb-2"
				aria-hidden
			/>
			<div className="text-sm font-medium text-foreground">{title}</div>
			<div className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
				{body}
			</div>
		</div>
	);
}

function ComingSoon({
	icon: Icon,
	title,
	body,
}: {
	icon: typeof LayoutGrid;
	title: string;
	body: string;
}) {
	return (
		<div className="mt-4 rounded-md border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
			<Icon
				className="mx-auto w-6 h-6 text-muted-foreground/60 mb-2"
				aria-hidden
			/>
			<div className="text-sm font-medium text-foreground">{title}</div>
			<div className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
				{body}
			</div>
			<div className="mt-3 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border uppercase tracking-wide">
				Coming soon
			</div>
		</div>
	);
}

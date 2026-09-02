import { Suspense } from "react";
import { usePolicyReferences } from "@/api/hooks/policies";
import type { Policy } from "@/api/types/policy";
import { DiagnosticList } from "@/diagnostics/DiagnosticList";
import { usePolicyDiagnostics } from "@/diagnostics/useDiagnostics";
import { HostLogo, hostRefLogo } from "@/hosts/HostLogo";
import { usePolicyHosts } from "@/policies/usePolicyHosts";
import { usePolicyModels } from "@/policies/usePolicyModels";
import { usePolicyUsage } from "@/policies/usePolicyUsage";
import {
	ResourceSpendCard,
	ResourceSpendCardSkeleton,
} from "@/usage/ResourceSpendCard";
import {
	ResourceUsageCards,
	UsageCardsSkeleton,
} from "@/usage/ResourceUsageCards";

interface Props {
	policy: Policy;
}

export function PolicyOverviewTab({ policy }: Props) {
	return (
		<div className="flex flex-col gap-6">
			<IssuesPanel policyId={policy.metadata.id} />

			<StatsGrid policy={policy} />

			<HostsPanel policy={policy} />
		</div>
	);
}

function StatsGrid({ policy }: { policy: Policy }) {
	const models = usePolicyModels(policy.metadata.name);
	const hosts = usePolicyHosts(policy.metadata.name);

	return (
		<section>
			<SectionTitle>Overview</SectionTitle>
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<StatCard
					label="Models"
					value={models.length}
					sub="granted by this policy"
				/>
				<StatCard
					label="Hosts"
					value={hosts.length}
					sub={hosts.length === 0 ? "no host resolved" : "serving requests"}
				/>
				{policy.metadata.id ? (
					<Suspense
						fallback={<StatCard label="API keys" value="…" sub="loading" />}
					>
						<KeyStatCard policyId={policy.metadata.id} />
					</Suspense>
				) : (
					<StatCard label="API keys" value="—" sub="unsaved" />
				)}
				{policy.metadata.id && (
					<>
						<Suspense fallback={<UsageCardsSkeleton />}>
							<PolicyUsageCards policyId={policy.metadata.id} />
						</Suspense>
						<Suspense fallback={<ResourceSpendCardSkeleton />}>
							<ResourceSpendCard
								dimension="policy_id"
								id={policy.metadata.id}
							/>
						</Suspense>
					</>
				)}
			</div>
		</section>
	);
}

function KeyStatCard({ policyId }: { policyId: string }) {
	const { data } = usePolicyReferences(policyId);
	const count = (data.items ?? []).filter((r) => r.kind === "key").length;
	return (
		<StatCard
			label="API keys"
			value={count}
			sub={count === 0 ? "unused" : "using this policy"}
		/>
	);
}

function HostsPanel({ policy }: { policy: Policy }) {
	const hosts = usePolicyHosts(policy.metadata.name);
	if (hosts.length === 0) {
		return (
			<section>
				<SectionTitle>Hosts</SectionTitle>
				<p className="text-xs text-muted-foreground">
					No hosts resolved — pick models in the catalog above.
				</p>
			</section>
		);
	}
	return (
		<section>
			<SectionTitle>Hosts in this policy</SectionTitle>
			<ul className="divide-y divide-border rounded-md border border-border">
				{hosts.map(({ host, hostKeys }) => {
					const keyCount = hostKeys?.length ?? 0;
					return (
						<li key={host.id} className="flex items-center gap-3 px-3 py-2">
							<HostLogo host={hostRefLogo(host)} size={22} />
							<div className="flex-1 min-w-0">
								<div className="text-sm text-foreground truncate">
									{host.displayName?.trim() || host.name}
								</div>
								<div className="text-[11px] text-muted-foreground truncate">
									{keyCount === 0
										? "no credential — requests will fail"
										: `${keyCount} credential${keyCount === 1 ? "" : "s"}`}
								</div>
							</div>
						</li>
					);
				})}
			</ul>
		</section>
	);
}

function PolicyUsageCards({ policyId }: { policyId: string }) {
	const usage = usePolicyUsage(policyId);
	return <ResourceUsageCards usage={usage} />;
}

function IssuesPanel({ policyId }: { policyId: string | undefined }) {
	const diagnostics = usePolicyDiagnostics(policyId);
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

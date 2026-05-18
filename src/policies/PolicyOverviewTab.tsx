import { Suspense } from "react";
import { usePolicyReferences } from "@/api/hooks/policies";
import type { Policy } from "@/api/types/policy";
import { DiagnosticList } from "@/diagnostics/DiagnosticList";
import { usePolicyDiagnostics } from "@/diagnostics/useDiagnostics";
import { HostLogo } from "@/hosts/HostLogo";
import { displayLabel } from "@/lib/displayLabel";
import { usePolicyResolvedCatalog } from "@/policies/usePolicyResolvedCatalog";

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
	const resolved = usePolicyResolvedCatalog(policy);

	return (
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
					value={resolved.modelCount}
					sub={`across ${resolved.providerCount} provider${resolved.providerCount === 1 ? "" : "s"}`}
				/>
				<StatCard
					label="Hosts"
					value={resolved.hosts.length}
					sub={
						resolved.hosts.length === 0
							? "no host resolved"
							: "serving requests"
					}
				/>
				{policy.metadata.id ? (
					<Suspense
						fallback={<StatCard label="Relay keys" value="…" sub="loading" />}
					>
						<RelayKeyStatCard policyId={policy.metadata.id} />
					</Suspense>
				) : (
					<StatCard label="Relay keys" value="—" sub="unsaved" />
				)}
				<StatCard
					label="Requests · 24h"
					value={MOCK_USAGE.requests24h.toLocaleString()}
					sub="mock"
					mono
				/>
				<StatCard
					label="Error rate"
					value={`${(MOCK_USAGE.errorRate * 100).toFixed(2)}%`}
					sub="mock"
					mono
				/>
				<StatCard
					label="p50 latency"
					value={`${MOCK_USAGE.p50Ms} ms`}
					sub="mock"
					mono
				/>
				<StatCard
					label="p95 latency"
					value={`${MOCK_USAGE.p95Ms} ms`}
					sub="mock"
					mono
				/>
				<StatCard
					label="Tokens in / out"
					value={`${(MOCK_USAGE.tokensIn / 1000).toFixed(0)}K / ${(MOCK_USAGE.tokensOut / 1000).toFixed(0)}K`}
					sub="mock"
					mono
				/>
			</div>
		</section>
	);
}

function RelayKeyStatCard({ policyId }: { policyId: string }) {
	const { data } = usePolicyReferences(policyId);
	const count = (data.items ?? []).filter((r) => r.kind === "relay-key").length;
	return (
		<StatCard
			label="Relay keys"
			value={count}
			sub={count === 0 ? "unused" : "using this policy"}
		/>
	);
}

function HostsPanel({ policy }: { policy: Policy }) {
	const { hosts } = usePolicyResolvedCatalog(policy);
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
				{hosts.map(({ host, modelCount }) => (
					<li
						key={host.metadata.id ?? host.metadata.name}
						className="flex items-center gap-3 px-3 py-2"
					>
						<HostLogo host={host} size={22} />
						<div className="flex-1 min-w-0">
							<div className="text-sm text-foreground truncate">
								{displayLabel(host.metadata)}
							</div>
							<div className="text-[11px] text-muted-foreground truncate">
								{modelCount} model{modelCount === 1 ? "" : "s"}
							</div>
						</div>
						<MockHostStats />
					</li>
				))}
			</ul>
		</section>
	);
}

function MockHostStats() {
	return (
		<div className="hidden sm:flex items-center gap-4 text-[11px] text-muted-foreground tabular-nums">
			<span>
				<span className="text-foreground">
					{Math.floor(Math.random() * 5000 + 100).toLocaleString()}
				</span>{" "}
				req
			</span>
			<span>
				<span className="text-foreground">
					{(Math.random() * 600 + 80).toFixed(0)}
				</span>{" "}
				ms p95
			</span>
			<span className="text-[10px] uppercase tracking-wide">mock</span>
		</div>
	);
}

const MOCK_USAGE = {
	requests24h: 12_847,
	errorRate: 0.012,
	p50Ms: 184,
	p95Ms: 612,
	tokensIn: 1_240_000,
	tokensOut: 412_000,
};

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

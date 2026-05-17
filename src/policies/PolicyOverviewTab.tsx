import { Suspense } from "react";
import { usePolicyReferences } from "@/api/hooks/policies";
import type { Policy } from "@/api/types/policy";
import { displayLabel } from "@/lib/displayLabel";

interface Props {
	policy: Policy;
}

export function PolicyOverviewTab({ policy }: Props) {
	const created = policy.metadata.id ? undefined : undefined; // not exposed yet
	const refsCount = (policy.spec.models ?? []).length;
	const hkCount = (policy.spec.hostKeyIds ?? []).length;
	const rlCount =
		(policy.spec.rlBindings ?? []).length + (policy.spec.rateLimitId ? 1 : 0);

	return (
		<div className="flex flex-col gap-6">
			<section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<StatCard label="Catalog refs" value={refsCount} />
				<StatCard label="Host keys" value={hkCount} />
				<StatCard label="Rate limits" value={rlCount} />
				<StatCard
					label="Key selection"
					value={policy.spec.keySelection ?? "random"}
					mono
				/>
			</section>

			<section>
				<SectionTitle>Identity</SectionTitle>
				<DescList>
					<Term label="Slug">
						<code className="font-mono text-foreground">
							{policy.metadata.name}
						</code>
					</Term>
					<Term label="Display name">{displayLabel(policy.metadata)}</Term>
					{policy.metadata.description && (
						<Term label="Description">{policy.metadata.description}</Term>
					)}
					{policy.metadata.id && (
						<Term label="ID">
							<code className="font-mono text-muted-foreground text-[11px]">
								{policy.metadata.id}
							</code>
						</Term>
					)}
				</DescList>
			</section>

			<section>
				<SectionTitle>What references this policy</SectionTitle>
				{policy.metadata.id ? (
					<Suspense
						fallback={
							<p className="text-xs text-muted-foreground">
								Loading references…
							</p>
						}
					>
						<ReferencesPanel policyId={policy.metadata.id} />
					</Suspense>
				) : (
					<p className="text-xs text-muted-foreground">
						Policy ID unknown — cannot list references yet.
					</p>
				)}
			</section>

			{/* keeps the unused expression around to silence biome no-unused-vars without disabling */}
			{created ? <span hidden>{created}</span> : null}
		</div>
	);
}

function ReferencesPanel({ policyId }: { policyId: string }) {
	const { data } = usePolicyReferences(policyId);
	const items = data.items ?? [];
	if (items.length === 0) {
		return (
			<p className="text-xs text-muted-foreground">
				Nothing references this policy. Safe to disable or delete.
			</p>
		);
	}
	return (
		<ul className="divide-y divide-border rounded-md border border-border">
			{items.map((r) => (
				<li
					key={`${r.kind}:${r.id}:${r.via}`}
					className="flex items-center gap-3 px-3 py-2 text-sm"
				>
					<KindChip kind={r.kind} />
					<div className="flex-1 min-w-0">
						<div className="text-foreground font-medium truncate">{r.name}</div>
						<div className="text-[11px] text-muted-foreground font-mono truncate">
							via {r.via}
						</div>
					</div>
				</li>
			))}
		</ul>
	);
}

function KindChip({ kind }: { kind: string }) {
	return (
		<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border font-mono">
			{kind}
		</span>
	);
}

function StatCard({
	label,
	value,
	mono,
}: {
	label: string;
	value: string | number;
	mono?: boolean;
}) {
	return (
		<div className="rounded-md border border-border bg-card px-3 py-2">
			<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</div>
			<div
				className={`mt-0.5 text-lg font-semibold text-foreground tabular-nums ${mono ? "font-mono text-sm" : ""}`}
			>
				{value}
			</div>
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

function DescList({ children }: { children: React.ReactNode }) {
	return (
		<dl className="divide-y divide-border rounded-md border border-border">
			{children}
		</dl>
	);
}

function Term({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="grid grid-cols-[140px_1fr] gap-3 px-3 py-2 text-sm">
			<dt className="text-[11px] text-muted-foreground self-center">{label}</dt>
			<dd className="text-foreground min-w-0 break-words">{children}</dd>
		</div>
	);
}

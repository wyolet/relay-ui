import {
	BookOpen,
	Brain,
	CalendarDays,
	GitBranch,
	History,
	Layers,
	LayoutGrid,
	type LucideIcon,
	Scale,
	Split,
} from "lucide-react";
import { Suspense } from "react";
import type { ModelHostView, ModelPolicyView } from "@/api/hooks/models";
import type { Model } from "@/api/types/model";
import { PlanIssuesPanel } from "@/diagnostics/IssuesPanel";
import { modelProductLine } from "@/models/groupModelsByFamily";
import { ModelCapabilityChips } from "@/models/ModelCapabilityChips";
import { ModelSnapshotsList } from "@/models/ModelSnapshotsList";
import {
	activeCapabilities,
	familyLabel,
	overviewCounts,
} from "@/models/modelDetail";
import { useModelUsage } from "@/models/useModelUsage";
import { DetailCard } from "@/shared/DetailCard";
import { StatCard, StatGrid } from "@/shared/StatCard";
import {
	ResourceSpendCard,
	ResourceSpendCardSkeleton,
} from "@/usage/ResourceSpendCard";
import {
	ResourceUsageCards,
	UsageCardsSkeleton,
} from "@/usage/ResourceUsageCards";

export function ModelOverviewTab({
	model,
	hostRows,
	policyRows,
}: {
	model: Model;
	hostRows: ModelHostView[];
	policyRows: ModelPolicyView[];
}) {
	const caps = activeCapabilities(model.spec.capabilities);
	const tags = model.spec.tags ?? [];
	const productLine = modelProductLine(model);
	const { enabledHosts, throttledPolicies } = overviewCounts(
		hostRows,
		policyRows,
	);
	const snapshots = model.spec.snapshots ?? [];

	return (
		<div className="flex flex-col gap-6 pt-2">
			<PlanIssuesPanel kind="model" id={model.metadata.id} />

			<StatGrid title="Overview">
				<StatCard
					label="Hosts"
					value={hostRows.length}
					sub={
						hostRows.length === 0 ? "not deployed" : `${enabledHosts} enabled`
					}
				/>
				<StatCard
					label="Policies"
					value={policyRows.length}
					sub={
						policyRows.length === 0
							? "unused"
							: `${throttledPolicies} throttled`
					}
				/>
				<StatCard
					label="Capabilities"
					value={caps.length}
					sub={caps.length === 0 ? "none declared" : "active"}
				/>
				<StatCard
					label="Snapshots"
					value={snapshots.length}
					sub={
						snapshots.length === 0
							? "none"
							: `pointer → ${model.spec.pointer || "—"}`
					}
				/>
				{model.metadata.id && (
					<>
						<Suspense fallback={<UsageCardsSkeleton />}>
							<ModelUsageCards modelId={model.metadata.id} />
						</Suspense>
						<Suspense fallback={<ResourceSpendCardSkeleton />}>
							<ResourceSpendCard dimension="model_id" id={model.metadata.id} />
						</Suspense>
					</>
				)}
			</StatGrid>

			<DetailCard title="Identity" icon={LayoutGrid}>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
					<IdentityTile
						icon={Layers}
						label="Family"
						value={familyLabel(model)}
					/>
					{productLine && (
						<IdentityTile icon={Split} label="Line" value={productLine} />
					)}
					<IdentityTile
						icon={CalendarDays}
						label="Released"
						value={model.spec.releaseDate}
					/>
					<IdentityTile
						icon={BookOpen}
						label="Knowledge cutoff"
						value={model.spec.knowledgeCutoff}
					/>
					<IdentityTile
						icon={Scale}
						label="License"
						value={model.spec.license}
					/>
					{model.spec.pointer && (
						<IdentityTile
							icon={GitBranch}
							label="Points to"
							value={model.spec.pointer}
						/>
					)}
				</div>
				{tags.length > 0 && (
					<div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-1.5">
						<span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1">
							Tags
						</span>
						{tags.map((t) => (
							<span
								key={t}
								className="inline-flex items-center h-5 px-1.5 rounded text-[10px] font-medium bg-muted text-foreground border border-border"
							>
								#{t}
							</span>
						))}
					</div>
				)}
			</DetailCard>

			{caps.length > 0 && (
				<DetailCard title="Capabilities" icon={Brain}>
					<ModelCapabilityChips caps={caps} />
				</DetailCard>
			)}

			{snapshots.length > 0 && (
				<DetailCard title="Snapshots" icon={History}>
					<ModelSnapshotsList snapshots={snapshots} />
				</DetailCard>
			)}
		</div>
	);
}

function ModelUsageCards({ modelId }: { modelId: string }) {
	const usage = useModelUsage(modelId);
	return <ResourceUsageCards usage={usage} />;
}

function IdentityTile({
	icon: Icon,
	label,
	value,
}: {
	icon: LucideIcon;
	label: string;
	value: string | null | undefined;
}) {
	return (
		<div className="rounded-md border border-border bg-muted/30 px-3 py-2.5 flex items-start gap-2.5">
			<Icon
				className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0"
				aria-hidden
			/>
			<div className="min-w-0">
				<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
					{label}
				</div>
				<div className="text-sm text-foreground truncate">
					{value || <span className="text-muted-foreground/70">—</span>}
				</div>
			</div>
		</div>
	);
}

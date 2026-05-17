import {
	AlertTriangle,
	Pencil,
	Plus,
	Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useHosts } from "@/api/hooks/hosts";
import { useModels } from "@/api/hooks/models";
import { useProviders } from "@/api/hooks/providers";
import { useAttachableRateLimits } from "@/api/hooks/ratelimits";
import { AttachRateLimitModal } from "@/rate-limits/AttachRateLimitModal";
import type { RLMeta } from "@/rate-limits/AttachRateLimitModal";
import { Button } from "@/components/ui/button";
import { buildConcreteCatalog } from "@/lib/concreteCatalog";
import { displayLabel } from "@/lib/displayLabel";
import {
	describeRef,
	formatScope,
	formatScopeFromConcrete,
	hostLabel,
	joinList,
	type LabelLookups,
	modelLabel,
	resolveBindings,
	type Carveout,
	type RefStats,
} from "@/lib/policyRLResolution";
import { formatRulesShort } from "@/lib/rateLimitFormat";
import type { RLBindingValue } from "@/policies/usePolicyForm";

interface PolicyRLPickerProps {
	bindings: RLBindingValue[];
	allowedModels: string[];
	includeDeprecated: boolean;
	onChange: (next: RLBindingValue[]) => void;
}

export function PolicyRLPicker({
	bindings,
	allowedModels,
	includeDeprecated,
	onChange,
}: PolicyRLPickerProps) {
	const allRateLimits = useAttachableRateLimits();
	const { data: providersData } = useProviders();
	const { data: modelsData } = useModels();
	const { data: hostsData } = useHosts();

	const rlMetaById = useMemo(() => {
		const m = new Map<string, RLMeta>();
		for (const rl of allRateLimits) {
			const id = rl.metadata.id;
			if (!id) continue;
			m.set(id, {
				id,
				label: displayLabel(rl.metadata),
				rules: formatRulesShort(rl.spec.rules),
			});
		}
		return m;
	}, [allRateLimits]);

	const concreteCatalog = useMemo(
		() =>
			buildConcreteCatalog({
				providers: providersData.items ?? [],
				models: modelsData.items ?? [],
				hosts: hostsData.items ?? [],
				includeDeprecated,
			}),
		[providersData, modelsData, hostsData, includeDeprecated],
	);

	const labels = useMemo<LabelLookups>(() => {
		const providerByName = new Map<string, string>();
		for (const p of providersData.items ?? []) {
			providerByName.set(p.metadata.name, displayLabel(p.metadata));
		}
		const hostByName = new Map<string, string>();
		for (const h of hostsData.items ?? []) {
			hostByName.set(h.metadata.name, displayLabel(h.metadata));
		}
		const modelByKey = new Map<string, string>();
		const providerIdToSlug = new Map<string, string>();
		for (const p of providersData.items ?? []) {
			if (p.metadata.id) providerIdToSlug.set(p.metadata.id, p.metadata.name);
		}
		for (const m of modelsData.items ?? []) {
			const ownerId =
				m.metadata.owner?.kind === "provider"
					? m.metadata.owner.id
					: undefined;
			const provider = ownerId ? providerIdToSlug.get(ownerId) : undefined;
			if (!provider) continue;
			modelByKey.set(
				`${provider}/${m.metadata.name}`,
				displayLabel(m.metadata),
			);
		}
		return { providerByName, hostByName, modelByKey };
	}, [providersData, modelsData, hostsData]);

	const resolution = useMemo(
		() => resolveBindings(bindings, concreteCatalog),
		[bindings, concreteCatalog],
	);

	const [editing, setEditing] = useState<
		{ kind: "new" } | { kind: "edit"; idx: number } | null
	>(null);

	const usedRLIds = useMemo(
		() =>
			new Set(
				bindings
					.map((b, i) =>
						editing?.kind === "edit" && editing.idx === i ? null : b.rateLimitId,
					)
					.filter((v): v is string => Boolean(v)),
			),
		[bindings, editing],
	);

	function remove(idx: number) {
		onChange(bindings.filter((_, i) => i !== idx));
	}

	function save(rateLimitId: string, models: string[]) {
		if (!editing) return;
		if (editing.kind === "new") {
			onChange([...bindings, { rateLimitId, models }]);
		} else {
			onChange(
				bindings.map((b, i) =>
					i === editing.idx ? { rateLimitId, models } : b,
				),
			);
		}
		setEditing(null);
	}

	return (
		<div className="flex flex-col gap-2">
			{bindings.length === 0 ? (
				<p className="text-[11px] text-muted-foreground">
					No rate limits attached — requests through this policy will be
					unlimited.
				</p>
			) : (
				<>
					{resolution.carveouts.length > 0 && (
						<OverlapWarning
							carveouts={resolution.carveouts}
							bindings={bindings}
							rlMetaById={rlMetaById}
							labels={labels}
						/>
					)}
					<ul className="flex flex-col gap-2">
						{bindings.map((b, i) => {
							const meta = rlMetaById.get(b.rateLimitId);
							const refStats = resolution.perBinding[i]?.refs ?? [];
							return (
								<li
									key={b.rateLimitId || `binding-${i}`}
									className="rounded-md border border-border bg-card px-3 py-2.5 shadow-sm"
								>
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0 flex-1">
											<div className="text-sm font-medium text-foreground truncate">
												{meta?.label ?? b.rateLimitId ?? "unknown rate limit"}
											</div>
											{meta?.rules && (
												<div className="font-mono text-[10px] text-muted-foreground truncate">
													{meta.rules}
												</div>
											)}
										</div>
										<div className="flex items-center gap-1 shrink-0">
											<button
												type="button"
												onClick={() => setEditing({ kind: "edit", idx: i })}
												className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
												aria-label="Edit"
											>
												<Pencil className="w-3.5 h-3.5" />
											</button>
											<button
												type="button"
												onClick={() => remove(i)}
												className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-muted"
												aria-label="Remove"
											>
												<Trash2 className="w-3.5 h-3.5" />
											</button>
										</div>
									</div>
									{b.models.length === 0 ? (
										<p className="mt-1.5 text-[11px] text-muted-foreground italic">
											applies to every request
										</p>
									) : (
										<ul className="mt-1.5 flex flex-col rounded-md border border-border bg-muted/20 divide-y divide-border">
											{refStats.map((s) => (
												<RefBlock
													key={s.raw}
													stats={s}
													labels={labels}
													rlMetaById={rlMetaById}
													bindings={bindings}
												/>
											))}
										</ul>
									)}
								</li>
							);
						})}
					</ul>
				</>
			)}

			<Button
				type="button"
				variant="default"
				className="self-start"
				onClick={() => setEditing({ kind: "new" })}
			>
				<Plus className="w-3.5 h-3.5" />
				Add rate limit
			</Button>

			{editing && (
				<AttachRateLimitModal
					existing={
						editing.kind === "edit"
							? bindings[editing.idx]
							: undefined
					}
					rateLimits={[...rlMetaById.values()]}
					excludeRLIds={usedRLIds}
					allowedModels={allowedModels}
					includeDeprecated={includeDeprecated}
					onClose={() => setEditing(null)}
					onSave={save}
				/>
			)}
		</div>
	);
}

interface OverlapWarningProps {
	carveouts: Carveout[];
	bindings: RLBindingValue[];
	rlMetaById: Map<string, RLMeta>;
	labels: LabelLookups;
}

function OverlapWarning({
	carveouts,
	bindings,
	rlMetaById,
	labels,
}: OverlapWarningProps) {
	function labelOf(idx: number): string {
		const b = bindings[idx];
		if (!b) return "unknown";
		return rlMetaById.get(b.rateLimitId)?.label ?? b.rateLimitId ?? "unknown";
	}

	return (
		<div className="rounded-md border border-amber-500/40 bg-amber-500/5">
			<div className="flex items-start gap-2 px-3 py-2">
				<AlertTriangle
					className="w-3.5 h-3.5 mt-0.5 text-amber-600 shrink-0"
					aria-hidden="true"
				/>
				<div className="flex-1 min-w-0">
					<div className="text-[12px] font-medium text-foreground">
						{carveouts.length === 1
							? "1 model overlaps between rate limits"
							: `${carveouts.length} models overlap between rate limits`}
					</div>
					<p className="text-[11px] text-muted-foreground">
						The most specific rule wins (host &gt; model &gt; provider). Ties
						go to whichever rate limit is listed first.
					</p>
				</div>
			</div>
			<div className="overflow-hidden border-t border-amber-500/30">
				<table className="w-full text-[11px]">
					<thead className="bg-amber-500/10 text-muted-foreground">
						<tr>
							<th
								scope="col"
								className="px-3 py-1.5 text-left font-medium text-[10px] uppercase tracking-wide"
							>
								Model
							</th>
							<th
								scope="col"
								className="px-3 py-1.5 text-left font-medium text-[10px] uppercase tracking-wide"
							>
								Host
							</th>
							<th
								scope="col"
								className="px-3 py-1.5 text-left font-medium text-[10px] uppercase tracking-wide"
							>
								Follows
							</th>
							<th
								scope="col"
								className="px-3 py-1.5 text-left font-medium text-[10px] uppercase tracking-wide"
							>
								Ignores
							</th>
						</tr>
					</thead>
					<tbody>
						{carveouts.map((c) => {
							const bnd = c.binding;
							const winnerLabel = labelOf(c.winner);
							const loserLabels = c.losers.map(labelOf);
							return (
								<tr
									key={`${bnd.provider}/${bnd.model}@${bnd.host}`}
									className="border-t border-amber-500/20"
								>
									<td className="px-3 py-1.5">
										<span className="text-foreground">
											{modelLabel(bnd.provider, bnd.model, labels)}
										</span>
										<code className="ml-1.5 font-mono text-[10px] text-muted-foreground">
											{bnd.provider}/{bnd.model}
										</code>
									</td>
									<td className="px-3 py-1.5 text-foreground">
										{hostLabel(bnd.host, labels)}
									</td>
									<td className="px-3 py-1.5 font-medium text-foreground">
										{winnerLabel}
									</td>
									<td className="px-3 py-1.5 text-muted-foreground line-through">
										{joinList(loserLabels)}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}

interface RefBlockProps {
	stats: RefStats;
	labels: LabelLookups;
	rlMetaById: Map<string, RLMeta>;
	bindings: RLBindingValue[];
}

function RefBlock({ stats, labels, rlMetaById, bindings }: RefBlockProps) {
	if (!stats.parsed) {
		return (
			<li className="px-2.5 py-1.5 bg-destructive/5">
				<code className="font-mono text-[11px] text-destructive">
					{stats.raw}
				</code>
				<span className="ml-2 text-[10px] text-destructive">invalid ref</span>
			</li>
		);
	}

	const lostConcrete = stats.lostTo.flatMap((l) => l.bindings);
	const phrase = describeRef(stats.parsed, labels, stats.coveredBindings);
	const scopeText = formatScope(stats.keptModels, stats.keptHosts);
	const hasLost = stats.lostTo.length > 0;

	return (
		<li className="px-2.5 py-2">
			<div className="flex items-baseline justify-between gap-2">
				<div className="min-w-0 flex-1">
					<div className="text-[12px] text-foreground">{phrase}</div>
					<div className="mt-0.5 flex items-center gap-2">
						<code className="font-mono text-[10px] text-muted-foreground">
							{stats.raw}
						</code>
						{stats.covered === 0 ? (
							<span className="text-[10px] text-muted-foreground">
								— no matching models
							</span>
						) : (
							<span className="text-[10px] text-muted-foreground tabular-nums">
								· {scopeText}
							</span>
						)}
					</div>
				</div>
			</div>

			{hasLost && (
				<div className="mt-2 rounded border border-amber-500/30 bg-amber-500/5 px-2 py-1.5">
					<div className="text-[11px] text-foreground">
						<AlertTriangle className="inline-block w-3 h-3 text-amber-600 mr-1 -mt-0.5" />
						Except {formatScopeFromConcrete(lostConcrete)} below — already
						governed by{" "}
						{stats.lostTo.length === 1
							? rlMetaById.get(
									bindings[stats.lostTo[0]?.ownerIdx ?? -1]?.rateLimitId ?? "",
								)?.label ?? "another rate limit"
							: "other rate limits"}
						.
					</div>
					<ul className="mt-1 flex flex-col gap-0.5">
						{stats.lostTo.map((l) => {
							const otherLabel =
								rlMetaById.get(bindings[l.ownerIdx]?.rateLimitId ?? "")?.label ??
								"unknown";
							return l.bindings.map((bnd) => (
								<li
									key={`${l.ownerIdx}-${bnd.provider}/${bnd.model}@${bnd.host}`}
									className="flex items-baseline gap-2 text-[11px]"
								>
									<span className="text-foreground truncate">
										{modelLabel(bnd.provider, bnd.model, labels)} hosted by{" "}
										{hostLabel(bnd.host, labels)}
									</span>
									<code className="font-mono text-[10px] text-muted-foreground truncate">
										{bnd.provider}/{bnd.model}@{bnd.host}
									</code>
									<span className="ml-auto text-[10px] text-muted-foreground shrink-0">
										→ {otherLabel}
									</span>
								</li>
							));
						})}
					</ul>
				</div>
			)}
		</li>
	);
}


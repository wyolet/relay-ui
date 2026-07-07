import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	parseCatalogRef,
	refsOverlap,
	validateCatalogRef,
} from "@/lib/catalogRef";
import {
	describeRef,
	formatScope,
	formatScopeFromConcrete,
	hostLabel,
	type LabelLookups,
	modelLabel,
	type RefStats,
} from "@/lib/policyRLResolution";
import { PolicyRLOverlapWarning } from "@/policies/PolicyRLOverlapWarning";
import type { RLBindingValue } from "@/policies/usePolicyForm";
import { usePolicyRLResolution } from "@/policies/usePolicyRLResolution";
import type { RLMeta } from "@/rate-limits/AttachRateLimitModal";
import { AttachRateLimitModal } from "@/rate-limits/AttachRateLimitModal";
import { AlertBanner } from "@/shared/AlertBanner";

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
	const { resolution, labels, rlMetaById } = usePolicyRLResolution(
		bindings,
		includeDeprecated,
	);

	const grantRefs = useMemo(
		() =>
			allowedModels
				.filter((g) => !validateCatalogRef(g))
				.map((g) => parseCatalogRef(g)),
		[allowedModels],
	);

	function orphansFor(refs: readonly string[]): string[] {
		return refs.filter((raw) => {
			if (validateCatalogRef(raw)) return false;
			const scope = parseCatalogRef(raw);
			return !grantRefs.some((g) => refsOverlap(g, scope));
		});
	}

	const [editing, setEditing] = useState<
		{ kind: "new" } | { kind: "edit"; idx: number } | null
	>(null);

	const usedRLIds = useMemo(
		() =>
			new Set(
				bindings
					.map((b, i) =>
						editing?.kind === "edit" && editing.idx === i
							? null
							: b.rateLimitId,
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
						<PolicyRLOverlapWarning
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
							const orphans = orphansFor(b.models);
							const fullyOrphaned =
								b.models.length > 0 && orphans.length === b.models.length;
							return (
								<li
									key={b.rateLimitId || `binding-${i}`}
									className={`rounded-md border bg-card overflow-hidden shadow-sm ${
										fullyOrphaned ? "border-warning/40" : "border-border"
									}`}
								>
									{fullyOrphaned && (
										<div className="border-b border-warning/30 bg-warning/5 px-3 py-2">
											<AlertBanner severity="warn">
												This rate limit targets{" "}
												{orphans.map((m, idx) => (
													<span key={m}>
														{idx > 0 && ", "}
														<code className="font-mono text-foreground">
															"{m}"
														</code>
													</span>
												))}
												{orphans.length === 1
													? ", which isn't"
													: ", which aren't"}{" "}
												in this policy's catalog. Remove this rate limit, or add{" "}
												{orphans.length === 1 ? "it" : "them"} to the policy's
												models.
											</AlertBanner>
										</div>
									)}
									<div className="px-3 py-2.5">
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
												<Button
													type="button"
													variant="ghost"
													size="icon"
													onClick={() => setEditing({ kind: "edit", idx: i })}
													className="text-muted-foreground"
													aria-label="Edit"
												>
													<Pencil className="size-3.5" />
												</Button>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													onClick={() => remove(i)}
													className="text-muted-foreground hover:text-destructive"
													aria-label="Remove"
												>
													<Trash2 className="size-3.5" />
												</Button>
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
									</div>
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
					existing={editing.kind === "edit" ? bindings[editing.idx] : undefined}
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
				<div className="mt-2 rounded border border-warning/30 bg-warning/5 px-2 py-1.5">
					<div className="text-[11px] text-foreground">
						<AlertTriangle className="inline-block w-3 h-3 text-warning mr-1 -mt-0.5" />
						Except {formatScopeFromConcrete(lostConcrete)} below — already
						governed by{" "}
						{stats.lostTo.length === 1
							? (rlMetaById.get(
									bindings[stats.lostTo[0]?.ownerIdx ?? -1]?.rateLimitId ?? "",
								)?.label ?? "another rate limit")
							: "other rate limits"}
						.
					</div>
					<ul className="mt-1 flex flex-col gap-0.5">
						{stats.lostTo.map((l) => {
							const otherLabel =
								rlMetaById.get(bindings[l.ownerIdx]?.rateLimitId ?? "")
									?.label ?? "unknown";
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

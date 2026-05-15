import {
	AlertTriangle,
	ChevronLeft,
	Pencil,
	Plus,
	Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useHosts } from "@/api/hooks/hosts";
import { useModels } from "@/api/hooks/models";
import { useProviders } from "@/api/hooks/providers";
import { useAttachableRateLimits } from "@/api/hooks/ratelimits";
import { ModelPicker } from "@/components/ModelPicker";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	assignBindingsSpecificityWins,
	type CatalogRef,
	type ConcreteBinding,
	parseCatalogRef,
	refCovers,
} from "@/lib/catalogRef";
import { buildConcreteCatalog } from "@/lib/concreteCatalog";
import { displayLabel } from "@/lib/displayLabel";
import { formatRulesShort } from "@/lib/rateLimitFormat";
import type { RLBindingValue } from "@/components/usePolicyForm";

interface PolicyRLPickerProps {
	bindings: RLBindingValue[];
	allowedModels: string[];
	includeDeprecated: boolean;
	onChange: (next: RLBindingValue[]) => void;
}

interface RLMeta {
	id: string;
	label: string;
	rules: string;
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

	const resolution = useMemo(
		() => resolveBindings(bindings, concreteCatalog),
		[bindings, concreteCatalog],
	);

	const [editing, setEditing] = useState<
		{ kind: "new" } | { kind: "edit"; idx: number } | null
	>(null);

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

	const usedRLIds = new Set(
		bindings
			.map((b, i) => (editing?.kind === "edit" && editing.idx === i ? null : b.rateLimitId))
			.filter((v): v is string => Boolean(v)),
	);

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
						/>
					)}
					<ul className="rounded-md border border-border bg-card divide-y divide-border">
						{bindings.map((b, i) => {
							const meta = rlMetaById.get(b.rateLimitId);
							const refStats = resolution.perBinding[i]?.refs ?? [];
							return (
								<li
									key={b.rateLimitId || `binding-${i}`}
									className="flex items-start justify-between gap-3 px-3 py-2.5"
								>
									<div className="min-w-0 flex-1">
										<div className="text-sm font-medium text-foreground truncate">
											{meta?.label ?? b.rateLimitId ?? "unknown rate limit"}
										</div>
										{meta?.rules && (
											<div className="font-mono text-[10px] text-muted-foreground truncate">
												{meta.rules}
											</div>
										)}
										{b.models.length === 0 ? (
											<p className="mt-1.5 text-[11px] text-muted-foreground italic">
												applies to every request
											</p>
										) : (
											<ul className="mt-1.5 flex flex-col divide-y divide-border rounded-md border border-border bg-muted/20">
												{refStats.map((s) => (
													<RefRow
														key={s.raw}
														stats={s}
														rlMetaById={rlMetaById}
														bindings={bindings}
													/>
												))}
											</ul>
										)}
									</div>
									<div className="flex items-center gap-1 shrink-0">
										<button
											type="button"
											onClick={() => setEditing({ kind: "edit", idx: i })}
											className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
											aria-label="Edit binding"
										>
											<Pencil className="w-3.5 h-3.5" />
										</button>
										<button
											type="button"
											onClick={() => remove(i)}
											className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-muted"
											aria-label="Remove binding"
										>
											<Trash2 className="w-3.5 h-3.5" />
										</button>
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

// ---------------------------------------------------------------------------
// Attach / edit modal — two-step wizard.
// ---------------------------------------------------------------------------

interface AttachRateLimitModalProps {
	existing: RLBindingValue | undefined;
	rateLimits: RLMeta[];
	excludeRLIds: Set<string>;
	allowedModels: string[];
	includeDeprecated: boolean;
	onClose: () => void;
	onSave: (rateLimitId: string, models: string[]) => void;
}

function AttachRateLimitModal({
	existing,
	rateLimits,
	excludeRLIds,
	allowedModels,
	includeDeprecated,
	onClose,
	onSave,
}: AttachRateLimitModalProps) {
	const isEdit = existing !== undefined;
	const [step, setStep] = useState<1 | 2>(isEdit ? 2 : 1);
	const [rateLimitId, setRateLimitId] = useState(existing?.rateLimitId ?? "");
	const [models, setModels] = useState<string[]>(existing?.models ?? []);

	const availableRLs = rateLimits.filter(
		(rl) => rl.id === rateLimitId || !excludeRLIds.has(rl.id),
	);

	return (
		<Dialog
			open
			onOpenChange={(open, details) => {
				// Block overlay click so the operator doesn't lose their picks.
				if (!open && details.reason === "outside-press") return;
				if (!open) onClose();
			}}
		>
			<DialogContent className="sm:max-w-3xl lg:max-w-4xl max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? "Edit rate limit binding" : "Attach rate limit"}
					</DialogTitle>
					<DialogDescription>
						Step {step} of 2 —{" "}
						{step === 1
							? "pick the rate limit to attach"
							: "pick which models this rate limit governs"}
					</DialogDescription>
				</DialogHeader>

				{step === 1 ? (
					<Step1RateLimit
						value={rateLimitId}
						onChange={setRateLimitId}
						options={availableRLs}
					/>
				) : (
					<Step2Models
						value={models}
						onChange={setModels}
						allowedModels={allowedModels}
						includeDeprecated={includeDeprecated}
						rateLimitLabel={
							rateLimits.find((rl) => rl.id === rateLimitId)?.label ?? "—"
						}
					/>
				)}

				<DialogFooter>
					<Button type="button" variant="ghost" onClick={onClose}>
						Cancel
					</Button>
					{step === 1 ? (
						<Button
							type="button"
							onClick={() => setStep(2)}
							disabled={!rateLimitId}
						>
							Continue
						</Button>
					) : (
						<>
							<Button
								type="button"
								variant="ghost"
								onClick={() => setStep(1)}
							>
								<ChevronLeft className="w-3.5 h-3.5" />
								Back
							</Button>
							<Button type="button" onClick={() => onSave(rateLimitId, models)}>
								{isEdit ? "Save changes" : "Attach"}
							</Button>
						</>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ---------------------------------------------------------------------------
// Step 1: rate limit picker
// ---------------------------------------------------------------------------

interface Step1Props {
	value: string;
	onChange: (id: string) => void;
	options: RLMeta[];
}

function Step1RateLimit({ value, onChange, options }: Step1Props) {
	const [q, setQ] = useState("");
	const filtered = q
		? options.filter(
				(o) =>
					o.label.toLowerCase().includes(q.toLowerCase()) ||
					o.rules.toLowerCase().includes(q.toLowerCase()),
			)
		: options;

	if (options.length === 0) {
		return (
			<div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground text-center">
				No rate limits available — create one first.
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			<input
				type="text"
				value={q}
				onChange={(e) => setQ(e.currentTarget.value)}
				placeholder="Search rate limits…"
				className="h-8 px-2 rounded-md border border-input bg-input/30 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
			/>
			<ul className="max-h-80 overflow-auto rounded-md border border-border bg-muted/20 divide-y divide-border">
				{filtered.length === 0 && (
					<li className="px-3 py-3 text-center text-xs text-muted-foreground">
						No matches.
					</li>
				)}
				{filtered.map((opt) => {
					const selected = opt.id === value;
					return (
						<li key={opt.id}>
							<button
								type="button"
								onClick={() => onChange(opt.id)}
								className={`w-full flex items-start gap-2 px-2 py-2 text-left hover:bg-muted/50 ${
									selected ? "bg-primary/10" : ""
								}`}
							>
								<span
									className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
										selected
											? "border-primary bg-primary"
											: "border-input"
									}`}
								>
									{selected && (
										<span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
									)}
								</span>
								<span className="flex flex-col min-w-0">
									<span className="text-sm font-medium text-foreground truncate">
										{opt.label}
									</span>
									{opt.rules && (
										<span className="font-mono text-[10px] text-muted-foreground truncate">
											{opt.rules}
										</span>
									)}
								</span>
							</button>
						</li>
					);
				})}
			</ul>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Step 2: model picker — constrained to allowedModels.
// ---------------------------------------------------------------------------

interface Step2Props {
	value: string[];
	onChange: (models: string[]) => void;
	allowedModels: string[];
	includeDeprecated: boolean;
	rateLimitLabel: string;
}

function Step2Models({
	value,
	onChange,
	allowedModels,
	includeDeprecated,
	rateLimitLabel,
}: Step2Props) {
	if (allowedModels.length === 0) {
		return (
			<div className="flex flex-col gap-2">
				<div className="text-[11px] text-muted-foreground">
					Attaching{" "}
					<span className="font-medium text-foreground">{rateLimitLabel}</span>
				</div>
				<div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground text-center">
					The Allowed catalog is empty. Save with no models to make this rate
					limit apply to every request, or add models to the Allowed catalog
					first to scope it.
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			<div className="text-[11px] text-muted-foreground">
				Attaching{" "}
				<span className="font-medium text-foreground">{rateLimitLabel}</span>
				{" — "}
				pick providers, models, or hosts from the policy's Allowed catalog.
			</div>
			<ModelPicker
				value={value}
				onChange={onChange}
				includeDeprecated={includeDeprecated}
				restrictTo={allowedModels}
			/>
			<p className="text-[10px] text-muted-foreground">
				No selection = this rate limit applies to every request to the policy.
			</p>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Overlap resolution
// ---------------------------------------------------------------------------

interface RefStats {
	raw: string;
	parsed: CatalogRef | null;
	covered: number;
	kept: number;
	keptModels: number;
	keptHosts: number;
	lostTo: { ownerIdx: number; bindings: ConcreteBinding[] }[];
}

interface BindingStats {
	refs: RefStats[];
}

interface Carveout {
	binding: ConcreteBinding;
	winner: number;
	losers: number[];
}

interface Resolution {
	perBinding: BindingStats[];
	carveouts: Carveout[];
}

function resolveBindings(
	bindings: readonly RLBindingValue[],
	catalog: readonly ConcreteBinding[],
): Resolution {
	const parsedRefsByBinding: (CatalogRef | null)[][] = bindings.map((b) =>
		b.models.map((s) => {
			try {
				return parseCatalogRef(s);
			} catch {
				return null;
			}
		}),
	);
	const groups = parsedRefsByBinding.map((refs, i) => ({
		owner: i,
		refs: refs.filter((r): r is CatalogRef => r !== null),
	}));
	const { assignments, carveouts } = assignBindingsSpecificityWins(
		groups,
		catalog,
	);

	const perBinding: BindingStats[] = bindings.map((b, i) => {
		const owned = assignments.get(i) ?? [];
		const refs: RefStats[] = b.models.map((raw, refIdx) => {
			const parsed = parsedRefsByBinding[i]?.[refIdx] ?? null;
			if (!parsed) {
				return {
					raw,
					parsed: null,
					covered: 0,
					kept: 0,
					keptModels: 0,
					keptHosts: 0,
					lostTo: [],
				};
			}
			const covered = catalog.filter((bnd) => refCovers(parsed, bnd));
			const kept = covered.filter((bnd) => owned.includes(bnd));
			const keptModels = new Set(
				kept.map((bnd) => `${bnd.provider}/${bnd.model}`),
			).size;
			const keptHosts = new Set(kept.map((bnd) => bnd.host)).size;
			// For bindings this ref covers but didn't keep, find the actual winner.
			const lostMap = new Map<number, ConcreteBinding[]>();
			for (const bnd of covered) {
				if (kept.includes(bnd)) continue;
				for (const c of carveouts) {
					if (c.binding === bnd && c.losers.includes(i)) {
						const list = lostMap.get(c.winner) ?? [];
						list.push(bnd);
						lostMap.set(c.winner, list);
						break;
					}
				}
			}
			const lostTo = [...lostMap.entries()].map(([ownerIdx, bnds]) => ({
				ownerIdx,
				bindings: bnds,
			}));
			return {
				raw,
				parsed,
				covered: covered.length,
				kept: kept.length,
				keptModels,
				keptHosts,
				lostTo,
			};
		});
		return { refs };
	});

	return { perBinding, carveouts };
}

// ---------------------------------------------------------------------------
// Overlap warning banner
// ---------------------------------------------------------------------------

interface OverlapWarningProps {
	carveouts: Carveout[];
	bindings: RLBindingValue[];
	rlMetaById: Map<string, RLMeta>;
}

function OverlapWarning({
	carveouts,
	bindings,
	rlMetaById,
}: OverlapWarningProps) {
	// Group carveouts by (winner, loser) pair so the banner reads as
	// "N models from RL-X taken over by RL-Y".
	const groups = new Map<string, {
		winner: number;
		loser: number;
		bindings: ConcreteBinding[];
	}>();
	for (const c of carveouts) {
		for (const loser of c.losers) {
			const key = `${c.winner}>${loser}`;
			const entry = groups.get(key) ?? {
				winner: c.winner,
				loser,
				bindings: [],
			};
			entry.bindings.push(c.binding);
			groups.set(key, entry);
		}
	}
	const list = [...groups.values()];

	function labelOf(idx: number): string {
		const b = bindings[idx];
		if (!b) return "unknown";
		return rlMetaById.get(b.rateLimitId)?.label ?? b.rateLimitId ?? "unknown";
	}

	return (
		<div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-[12px]">
			<AlertTriangle
				className="w-3.5 h-3.5 mt-0.5 text-amber-600 shrink-0"
				aria-hidden="true"
			/>
			<div className="flex-1 min-w-0">
				<div className="font-medium text-foreground">
					Some models are claimed by more than one rate limit
				</div>
				<p className="mt-0.5 text-[11px] text-muted-foreground">
					The most specific rule wins per concrete binding (host &gt; model
					&gt; provider). On a tie, the rule listed first wins.
				</p>
				<ul className="mt-1.5 flex flex-col gap-1">
					{list.map((g) => (
						<li
							key={`${g.winner}-${g.loser}`}
							className="text-[11px] text-foreground"
						>
							<span className="font-semibold">{labelOf(g.winner)}</span> takes{" "}
							<Popover>
								<PopoverTrigger className="underline decoration-dotted underline-offset-2 hover:text-foreground">
									{g.bindings.length}{" "}
									{g.bindings.length === 1 ? "binding" : "bindings"}
								</PopoverTrigger>
								<PopoverContent
									align="start"
									className="max-h-72 w-80 overflow-auto p-2"
								>
									<ul className="flex flex-col gap-0.5">
										{g.bindings.map((bnd) => (
											<li
												key={`${bnd.provider}/${bnd.model}@${bnd.host}`}
												className="font-mono text-[11px]"
											>
												{bnd.provider}/{bnd.model}@{bnd.host}
											</li>
										))}
									</ul>
								</PopoverContent>
							</Popover>{" "}
							from <span className="font-semibold">{labelOf(g.loser)}</span>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Per-ref row (inside a binding card)
// ---------------------------------------------------------------------------

interface RefRowProps {
	stats: RefStats;
	rlMetaById: Map<string, RLMeta>;
	bindings: RLBindingValue[];
}

function RefRow({ stats, rlMetaById, bindings }: RefRowProps) {
	const hasLost = stats.lostTo.length > 0;
	const lostCount = stats.lostTo.reduce(
		(n, l) => n + l.bindings.length,
		0,
	);
	const lostLabels = stats.lostTo
		.map(
			(l) =>
				rlMetaById.get(bindings[l.ownerIdx]?.rateLimitId ?? "")?.label ??
				"unknown",
		)
		.filter((s) => s.length > 0);

	return (
		<li className="px-2.5 py-1.5 flex items-center justify-between gap-3">
			<code className="font-mono text-[12px] text-foreground truncate min-w-0 flex-1">
				{stats.raw}
			</code>
			<div className="flex items-center gap-2 shrink-0">
				{!stats.parsed ? (
					<span className="text-[10px] text-destructive">invalid</span>
				) : stats.covered === 0 ? (
					<span className="text-[10px] text-muted-foreground">
						no matching models
					</span>
				) : hasLost ? (
					<Popover>
						<PopoverTrigger className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-500/10">
							<AlertTriangle className="w-3 h-3" />
							{formatScope(stats.keptModels, stats.keptHosts)} · {lostCount}{" "}
							taken by{" "}
							{lostLabels.length === 1
								? lostLabels[0]
								: `${lostLabels.length} others`}
						</PopoverTrigger>
						<PopoverContent
							align="end"
							className="max-h-72 w-80 overflow-auto p-2"
						>
							<div className="flex flex-col gap-2">
								{stats.lostTo.map((l) => {
									const otherLabel =
										rlMetaById.get(bindings[l.ownerIdx]?.rateLimitId ?? "")
											?.label ?? "unknown";
									return (
										<div key={l.ownerIdx} className="flex flex-col gap-1">
											<div className="text-[11px] text-foreground">
												<span className="font-semibold">{otherLabel}</span>{" "}
												takes {l.bindings.length}{" "}
												{l.bindings.length === 1 ? "binding" : "bindings"}
											</div>
											<ul className="pl-3 border-l border-border flex flex-col gap-0.5">
												{l.bindings.map((bnd) => (
													<li
														key={`${bnd.provider}/${bnd.model}@${bnd.host}`}
														className="font-mono text-[10px] text-muted-foreground"
													>
														{bnd.provider}/{bnd.model}@{bnd.host}
													</li>
												))}
											</ul>
										</div>
									);
								})}
							</div>
						</PopoverContent>
					</Popover>
				) : (
					<span className="text-[10px] text-muted-foreground tabular-nums">
						{formatScope(stats.keptModels, stats.keptHosts)}
					</span>
				)}
			</div>
		</li>
	);
}

function formatScope(models: number, hosts: number): string {
	const m = `${models} ${models === 1 ? "model" : "models"}`;
	const h = `${hosts} ${hosts === 1 ? "host" : "hosts"}`;
	return `${m} · ${h}`;
}

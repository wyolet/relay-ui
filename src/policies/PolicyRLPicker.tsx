import { Pencil, Plus, Trash2 } from "lucide-react";
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
	type LabelLookups,
	type RefCoverage,
} from "@/lib/policyRLResolution";
import type { RateLimitLinkValue } from "@/policies/policyFormSpec";
import { usePolicyRLResolution } from "@/policies/usePolicyRLResolution";
import { AttachRateLimitModal } from "@/rate-limits/AttachRateLimitModal";
import { AlertBanner } from "@/shared/AlertBanner";

interface PolicyRLPickerProps {
	links: RateLimitLinkValue[];
	allowedModels: string[];
	includeDeprecated: boolean;
	onChange: (next: RateLimitLinkValue[]) => void;
}

export function PolicyRLPicker({
	links,
	allowedModels,
	includeDeprecated,
	onChange,
}: PolicyRLPickerProps) {
	const { scopes, labels, rlMetaById } = usePolicyRLResolution(
		links,
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
				links
					.map((l, i) =>
						editing?.kind === "edit" && editing.idx === i
							? null
							: l.rateLimitId,
					)
					.filter((v): v is string => Boolean(v)),
			),
		[links, editing],
	);

	function remove(idx: number) {
		onChange(links.filter((_, i) => i !== idx));
	}

	function save(rateLimitId: string, models: string[]) {
		if (!editing) return;
		if (editing.kind === "new") {
			onChange([...links, { rateLimitId, models }]);
		} else {
			onChange(
				links.map((l, i) => (i === editing.idx ? { rateLimitId, models } : l)),
			);
		}
		setEditing(null);
	}

	return (
		<div className="flex flex-col gap-2">
			{links.length === 0 ? (
				<p className="text-[11px] text-muted-foreground">
					No rate limits attached — requests through this policy will be
					unlimited.
				</p>
			) : (
				<ul className="flex flex-col gap-2">
					{links.map((l, i) => {
						const meta = rlMetaById.get(l.rateLimitId);
						const refScopes = scopes[i] ?? [];
						const orphans = orphansFor(l.models);
						const fullyOrphaned =
							l.models.length > 0 && orphans.length === l.models.length;
						return (
							<li
								// Relay refuses one rate limit linked twice over the same models.
								key={`${l.rateLimitId}|${l.models.join(",")}`}
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
												{meta?.label ?? l.rateLimitId ?? "unknown rate limit"}
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
									{l.models.length === 0 ? (
										<p className="mt-1.5 text-[11px] text-muted-foreground italic">
											applies to every request
										</p>
									) : (
										<ul className="mt-1.5 flex flex-col rounded-md border border-border bg-muted/20 divide-y divide-border">
											{refScopes.map((s) => (
												<RefBlock key={s.raw} coverage={s} labels={labels} />
											))}
										</ul>
									)}
								</div>
							</li>
						);
					})}
				</ul>
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
					existing={editing.kind === "edit" ? links[editing.idx] : undefined}
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

function RefBlock({
	coverage,
	labels,
}: {
	coverage: RefCoverage;
	labels: LabelLookups;
}) {
	if (!coverage.parsed) {
		return (
			<li className="px-2.5 py-1.5 bg-destructive/5">
				<code className="font-mono text-[11px] text-destructive">
					{coverage.raw}
				</code>
				<span className="ml-2 text-[10px] text-destructive">invalid ref</span>
			</li>
		);
	}

	return (
		<li className="px-2.5 py-2">
			<div className="text-[12px] text-foreground">
				{describeRef(coverage.parsed, labels, coverage.coveredBindings)}
			</div>
			<div className="mt-0.5 flex items-center gap-2">
				<code className="font-mono text-[10px] text-muted-foreground">
					{coverage.raw}
				</code>
				{coverage.coveredBindings.length === 0 ? (
					<span className="text-[10px] text-muted-foreground">
						— no matching models
					</span>
				) : (
					<span className="text-[10px] text-muted-foreground tabular-nums">
						· {formatScope(coverage.models, coverage.hosts)}
					</span>
				)}
			</div>
		</li>
	);
}

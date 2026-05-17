import {
	type Carveout,
	hostLabel,
	joinList,
	type LabelLookups,
	modelLabel,
} from "@/lib/policyRLResolution";
import type { RLMeta } from "@/rate-limits/AttachRateLimitModal";
import { AlertBanner } from "@/shared/AlertBanner";

interface Props {
	carveouts: Carveout[];
	bindings: { rateLimitId: string }[];
	rlMetaById: Map<string, RLMeta>;
	labels: LabelLookups;
}

/**
 * Banner explaining which concrete (model, host) bindings were claimed by
 * multiple rate-limit bindings and which won by specificity-wins. Reused
 * between the policy edit picker and the detail page.
 */
export function PolicyRLOverlapWarning({
	carveouts,
	bindings,
	rlMetaById,
	labels,
}: Props) {
	function labelOf(idx: number): string {
		const b = bindings[idx];
		if (!b) return "unknown";
		return rlMetaById.get(b.rateLimitId)?.label ?? b.rateLimitId ?? "unknown";
	}

	return (
		<AlertBanner
			severity="warn"
			title={
				carveouts.length === 1
					? "1 model overlaps between rate limits"
					: `${carveouts.length} models overlap between rate limits`
			}
			body={
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
			}
		>
			The most specific rule wins (host &gt; model &gt; provider). Ties go to
			whichever rate limit is listed first.
		</AlertBanner>
	);
}

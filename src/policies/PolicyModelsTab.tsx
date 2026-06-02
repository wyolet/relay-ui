import { Link } from "@tanstack/react-router";
import type { Policy } from "@/api/types/policy";
import { usePolicyModels } from "@/policies/usePolicyModels";

interface Props {
	policy: Policy;
}

/**
 * Models this policy grants, resolved server-side via
 * `GET /policies/{ref}/models`. Each row is a concrete model with the
 * effective limits the policy applies to it — no client-side catalog join.
 */
export function PolicyModelsTab({ policy }: Props) {
	const models = usePolicyModels(policy.metadata.name);
	const grants = policy.spec.models ?? [];

	if (grants.length === 0) {
		return (
			<EmptyState
				title="No catalog refs"
				message="This policy currently grants nothing. Add catalog refs in the edit form."
			/>
		);
	}

	if (models.length === 0) {
		return (
			<EmptyState
				title="No reachable models"
				message="The catalog refs on this policy don't match any model currently in the catalog. They may match models added later, or you may need to revisit them."
			/>
		);
	}

	return (
		<div className="flex flex-col gap-4 pt-2">
			<div className="text-[11px] text-muted-foreground">
				{grants.length} catalog grant{grants.length === 1 ? "" : "s"} reach{" "}
				<span className="text-foreground tabular-nums">{models.length}</span>{" "}
				model{models.length === 1 ? "" : "s"}.
			</div>

			<div className="rounded-md border border-border bg-card overflow-hidden">
				<table className="w-full text-sm">
					<thead className="bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground">
						<tr>
							<th className="px-3 py-1.5 text-left font-medium">Model</th>
							<th className="px-3 py-1.5 text-left font-medium">Limits applied</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{models.map((row) => {
							const limits = row.limits ?? [];
							const displayName = row.model.displayName?.trim();
							return (
								<tr
									key={row.model.id}
									className="hover:bg-muted/40 transition-colors"
								>
									<td className="px-3 py-2">
										<div className="flex items-baseline gap-2 min-w-0 flex-wrap">
											{displayName && (
												<span className="text-foreground text-[13px] truncate">
													{displayName}
												</span>
											)}
											<Link
												to="/models/$name"
												params={{ name: row.model.name }}
												className="font-mono text-foreground text-[11px] hover:underline truncate"
											>
												{row.model.name}
											</Link>
										</div>
									</td>
									<td className="px-3 py-2">
										{limits.length === 0 ? (
											<span className="text-[11px] text-muted-foreground">
												no limit
											</span>
										) : (
											<ul className="flex flex-wrap gap-1">
												{limits.map((l) => (
													<li
														key={`${l.meter}-${l.window}-${l.amount}`}
														className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground"
														title={l.strategy}
													>
														{l.amount.toLocaleString()} {l.meter} / {l.window}
													</li>
												))}
											</ul>
										)}
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

function EmptyState({ title, message }: { title: string; message: string }) {
	return (
		<div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-center mt-2">
			<div className="text-sm font-medium text-foreground">{title}</div>
			<div className="mt-0.5 text-xs text-muted-foreground">{message}</div>
		</div>
	);
}

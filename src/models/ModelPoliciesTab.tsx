import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import type { ModelPolicyView } from "@/api/hooks/models";
import { DetailTable, Td } from "@/shared/DetailTable";
import { EmptyState } from "@/shared/EmptyState";

const COLUMNS = [
	{ label: "Policy" },
	{ label: "Owner" },
	{ label: "Limits applied" },
];

export function ModelPoliciesTab({ rows }: { rows: ModelPolicyView[] }) {
	if (rows.length === 0) {
		return (
			<EmptyState
				icon={ShieldCheck}
				title="Not granted by any policy"
				body="No user policy's catalog covers this model. Add a matching ref to a policy's grants to expose it."
			/>
		);
	}
	return (
		<DetailTable columns={COLUMNS}>
			{rows.map((row) => {
				const limits = row.limits ?? [];
				return (
					<tr key={row.id} className="hover:bg-muted/30 transition-colors">
						<Td>
							<Link
								to="/policies/$name"
								params={{ name: row.name }}
								className="font-mono text-[12px] text-foreground hover:underline"
							>
								{row.name}
							</Link>
						</Td>
						<Td>
							<span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
								<span className="rounded bg-muted px-1.5 py-0.5 font-medium uppercase tracking-wide text-[9px] text-muted-foreground border border-border">
									{row.owner.kind}
								</span>
								{row.owner.name && (
									<span className="text-foreground">{row.owner.name}</span>
								)}
							</span>
						</Td>
						<Td>
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
						</Td>
					</tr>
				);
			})}
		</DetailTable>
	);
}

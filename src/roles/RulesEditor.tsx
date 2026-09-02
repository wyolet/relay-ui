import { Plus, Trash2 } from "lucide-react";
import type { RoleRule } from "@/api/types/role";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { TokenMultiSelect } from "@/roles/TokenMultiSelect";
import { RULE_KINDS, RULE_VERBS } from "@/roles/vocabulary";

/** `id` keys the rows while a rule is still being filled in. */
export interface RuleRow {
	id: string;
	kinds: string[];
	verbs: string[];
}

export function newRuleRow(
	kinds: string[] = [],
	verbs: string[] = [],
): RuleRow {
	return { id: crypto.randomUUID(), kinds, verbs };
}

export function toRuleRows(rules: RoleRule[] | null | undefined): RuleRow[] {
	return (rules ?? []).map((r) => newRuleRow(r.kinds ?? [], r.verbs ?? []));
}

/** Drops rules that name no kind or no verb — the server rejects them. */
export function fromRuleRows(rows: RuleRow[]): RoleRule[] {
	return rows
		.filter((r) => r.kinds.length > 0 && r.verbs.length > 0)
		.map((r) => ({ kinds: r.kinds, verbs: r.verbs }));
}

export function RulesEditor({
	rows,
	onChange,
}: {
	rows: RuleRow[];
	onChange: (next: RuleRow[]) => void;
}) {
	function patch(id: string, field: "kinds" | "verbs", next: string[]) {
		onChange(rows.map((r) => (r.id === id ? { ...r, [field]: next } : r)));
	}

	return (
		<div className="flex flex-col gap-3">
			{rows.map((r) => (
				<div
					key={r.id}
					className="rounded-md border border-border bg-muted/20 p-3"
				>
					<div className="flex items-start justify-between gap-2">
						<div className="flex min-w-0 flex-col gap-2">
							<div>
								<p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
									Kinds
								</p>
								<TokenMultiSelect
									label="Add kind"
									options={RULE_KINDS}
									values={r.kinds}
									onChange={(next) => patch(r.id, "kinds", next)}
								/>
							</div>
							<div>
								<p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
									Verbs
								</p>
								<TokenMultiSelect
									label="Add verb"
									options={RULE_VERBS}
									values={r.verbs}
									onChange={(next) => patch(r.id, "verbs", next)}
								/>
							</div>
						</div>
						<IconButton
							icon={Trash2}
							weight="bare"
							size="sm"
							label="Remove rule"
							onClick={() => onChange(rows.filter((x) => x.id !== r.id))}
						/>
					</div>
				</div>
			))}
			<div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => onChange([...rows, newRuleRow()])}
				>
					<Plus className="w-3.5 h-3.5" />
					Add rule
				</Button>
			</div>
		</div>
	);
}

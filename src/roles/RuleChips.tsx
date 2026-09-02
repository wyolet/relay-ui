import type { RoleRule } from "@/api/types/role";
import { Chip } from "@/shared/Chip";

/** One rule read-only: the kinds it names × the verbs it grants on them. */
export function RuleChips({ rule }: { rule: RoleRule }) {
	return (
		<div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
			<div className="flex flex-wrap gap-1">
				{(rule.kinds ?? []).map((k) => (
					<Chip key={k} label={k} mono shape="box" />
				))}
			</div>
			<span className="text-[11px] text-muted-foreground sm:pt-1">×</span>
			<div className="flex flex-wrap gap-1">
				{(rule.verbs ?? []).map((v) => (
					<Chip key={v} label={v} mono shape="box" tone="primary" />
				))}
			</div>
		</div>
	);
}

/** Compact one-line form for table rows. */
export function ruleSummary(rules: RoleRule[] | null | undefined): string {
	const list = rules ?? [];
	if (list.length === 0) return "no rules";
	const kinds = new Set<string>();
	const verbs = new Set<string>();
	for (const r of list) {
		for (const k of r.kinds ?? []) kinds.add(k);
		for (const v of r.verbs ?? []) verbs.add(v);
	}
	return `${kinds.size} kind${kinds.size === 1 ? "" : "s"} · ${verbs.size} verb${
		verbs.size === 1 ? "" : "s"
	}`;
}

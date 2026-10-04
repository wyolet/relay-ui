import { OwnerLink } from "@/projects/OwnerLink";
import { parseScope } from "./auditFilterConfig";

/**
 * An audit row's scope chain ("project:<id>", "team:<id>", most specific
 * first) as linked chips. The chain is the owner rendered as strings, so it
 * reuses OwnerLink rather than growing a second team/project chip.
 */
export function ScopeChips({ scope }: { scope: string[] | null | undefined }) {
	const parsed = (scope ?? [])
		.map((s) => ({ raw: s, ...(parseScope(s) ?? {}) }))
		.filter((s): s is { raw: string; kind: "team" | "project"; id: string } =>
			Boolean(s.kind),
		);
	if (parsed.length === 0) {
		return <span className="text-[11px] text-muted-foreground">Global</span>;
	}
	return (
		<span className="inline-flex flex-wrap items-center gap-1">
			{parsed.map((s) => (
				<OwnerLink key={s.raw} owner={{ kind: s.kind, id: s.id }} />
			))}
		</span>
	);
}

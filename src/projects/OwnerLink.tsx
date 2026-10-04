import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Boxes, Users } from "lucide-react";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import { teamsListQueryOptions } from "@/api/hooks/teams";
import type { components } from "@/api/types.gen";
import { displayLabel } from "@/lib/displayLabel";

/**
 * Links a row's `metadata.owner` to the team or project that owns it.
 * Renders nothing for the other owner kinds (system, host, provider, user) —
 * callers drop it into any row and only tenancy owners show up. The lists it
 * resolves slugs from are queried non-suspending, so a route that never
 * loaded them still renders (the id shows until they arrive).
 */
export function OwnerLink({
	owner,
}: {
	owner: components["schemas"]["Owner"] | undefined;
}) {
	const kind = owner?.kind;
	const id = owner?.id ?? "";
	const { data: teams } = useQuery({
		...teamsListQueryOptions,
		enabled: kind === "team" && id.length > 0,
	});
	const { data: projects } = useQuery({
		...projectsListQueryOptions,
		enabled: kind === "project" && id.length > 0,
	});
	if (!id || (kind !== "team" && kind !== "project")) return null;

	const row = (
		kind === "team" ? (teams?.items ?? []) : (projects?.items ?? [])
	).find((r) => r.metadata.id === id);
	const label = row ? displayLabel(row.metadata) : `${id.slice(0, 6)}…`;
	const Icon = kind === "team" ? Users : Boxes;
	const className =
		"inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border hover:text-foreground transition-colors";

	if (!row) {
		return (
			<span className={className} title={`${kind} ${id}`}>
				<Icon className="w-3 h-3" aria-hidden />
				{label}
			</span>
		);
	}
	return kind === "team" ? (
		<Link
			to="/teams/$name"
			params={{ name: row.metadata.name }}
			className={className}
		>
			<Icon className="w-3 h-3" aria-hidden />
			{label}
		</Link>
	) : (
		<Link
			to="/projects/$name"
			params={{ name: row.metadata.name }}
			className={className}
		>
			<Icon className="w-3 h-3" aria-hidden />
			{label}
		</Link>
	);
}

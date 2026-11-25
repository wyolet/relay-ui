import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Boxes, UserRound, Users } from "lucide-react";
import { useAuth } from "@/api/auth";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import { teamsListQueryOptions } from "@/api/hooks/teams";
import { usersListQueryOptions } from "@/api/hooks/users";
import type { components } from "@/api/types.gen";
import { displayLabel } from "@/lib/displayLabel";

const CHIP =
	"inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border hover:text-foreground transition-colors";

/** A user owner: "Personal" for the caller, else the username when the caller may list users. */
function UserOwnerLink({ id }: { id: string }) {
	const { userId } = useAuth();
	const own = id === userId;
	const { data: users } = useQuery({
		...usersListQueryOptions,
		enabled: !own,
	});
	const user = own ? undefined : users?.find((u) => u.id === id);
	const content = (
		<>
			<UserRound className="w-3 h-3" aria-hidden />
			{own ? "Personal" : (user?.username ?? `${id.slice(0, 6)}…`)}
		</>
	);
	return user ? (
		<Link to="/users/$id" params={{ id }} className={CHIP}>
			{content}
		</Link>
	) : (
		<span className={CHIP} title={`user ${id}`}>
			{content}
		</span>
	);
}

/**
 * Links a row's `metadata.owner` to the team or project that owns it.
 * Renders nothing for the other owner kinds (system, host, provider, and user
 * unless `showUser`) — callers drop it into any row and only tenancy owners
 * show up. The lists it resolves slugs from are queried non-suspending, so a
 * route that never loaded them still renders (the id shows until they arrive).
 */
export function OwnerLink({
	owner,
	showUser = false,
}: {
	owner: components["schemas"]["Owner"] | undefined;
	/** Also show a user owner, for kinds a user may own beside teams and projects. */
	showUser?: boolean;
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
	if (showUser && kind === "user" && id) return <UserOwnerLink id={id} />;
	if (!id || (kind !== "team" && kind !== "project")) return null;

	const row = (
		kind === "team" ? (teams?.items ?? []) : (projects?.items ?? [])
	).find((r) => r.metadata.id === id);
	const label = row ? displayLabel(row.metadata) : `${id.slice(0, 6)}…`;
	const Icon = kind === "team" ? Users : Boxes;

	if (!row) {
		return (
			<span className={CHIP} title={`${kind} ${id}`}>
				<Icon className="w-3 h-3" aria-hidden />
				{label}
			</span>
		);
	}
	return kind === "team" ? (
		<Link
			to="/teams/$name"
			params={{ name: row.metadata.name }}
			className={CHIP}
		>
			<Icon className="w-3 h-3" aria-hidden />
			{label}
		</Link>
	) : (
		<Link
			to="/projects/$name"
			params={{ name: row.metadata.name }}
			className={CHIP}
		>
			<Icon className="w-3 h-3" aria-hidden />
			{label}
		</Link>
	);
}

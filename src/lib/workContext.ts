import type { UsageSummaryFilter } from "@/api/hooks/usage";
import type { components } from "@/api/types.gen";
import type { OwnerOption } from "@/lib/ownerScopes";

type MyContext = components["schemas"]["MyContext"];
type Owner = components["schemas"]["Owner"];

/** A scope new rows land in: one of /me/contexts, or System for admins. */
export interface WorkContext {
	kind: MyContext["kind"] | "system";
	/** The user id for personal, the team or project id, "" for System. */
	id: string;
	displayName: string;
	/** The project's team. Projects only. */
	teamId?: string;
	/** The caller is an admin there (always for personal and the organization). */
	admin: boolean;
}

/** What the store keeps across reloads. */
export type WorkContextRef = Pick<WorkContext, "kind" | "id">;

export const SYSTEM_CONTEXT: WorkContext = {
	kind: "system",
	id: "",
	displayName: "Organization",
	admin: true,
};

const KIND_LABEL: Record<"team" | "project", string> = {
	team: "Team",
	project: "Project",
};

/** The caller's contexts: the organization first for admins (their default), then personal, then the rest in server order. */
export function workContexts(
	mine: readonly MyContext[],
	isAdmin: boolean,
): WorkContext[] {
	const listed = mine.map(
		(c): WorkContext => ({
			kind: c.kind,
			id: c.id,
			displayName: c.displayName,
			admin: c.admin,
			...(c.teamId ? { teamId: c.teamId } : {}),
		}),
	);
	if (!isAdmin) return listed;
	return [
		SYSTEM_CONTEXT,
		...listed.filter((c) => c.kind === "personal"),
		...listed.filter((c) => c.kind !== "personal"),
	];
}

/** One string per context, for radio values and keys. */
export function contextKey(ctx: WorkContextRef): string {
	return `${ctx.kind}:${ctx.id}`;
}

/** The stored context while the caller still has it, else the first one. A
 * project whose team is listed resolves to the team: the switcher lists teams only. */
export function resolveWorkContext(
	contexts: readonly WorkContext[],
	stored: WorkContextRef | null,
): WorkContext | undefined {
	const kept = stored
		? contexts.find((c) => contextKey(c) === contextKey(stored))
		: undefined;
	const team =
		kept?.kind === "project"
			? contexts.find((c) => c.kind === "team" && c.id === kept.teamId)
			: undefined;
	return team ?? kept ?? contexts[0];
}

/** The usage a workspace shows: your own requests, a team's or project's
 * traffic (a team's includes its projects'), or all of it. */
export function contextUsageScope(
	ctx: WorkContextRef,
): Pick<UsageSummaryFilter, "principal_id" | "team_id" | "project_id"> {
	switch (ctx.kind) {
		case "personal":
			return { principal_id: [ctx.id] };
		case "team":
			return { team_id: [ctx.id] };
		case "project":
			return { project_id: [ctx.id] };
		case "system":
			return {};
	}
}

/** The owner-filter keys a workspace starts with: a team brings its projects,
 * the organization starts unfiltered, as its usage does. */
export function workspaceKeys(
	current: WorkContext,
	contexts: readonly WorkContext[],
): string[] {
	if (current.kind === "system") return [];
	const projects =
		current.kind === "team"
			? contexts.filter((c) => c.kind === "project" && c.teamId === current.id)
			: [];
	return [current, ...projects].map(contextKey);
}

/**
 * Where a create from this workspace lands. The organization is a view, not an
 * owner (relay's system rows are global catalog data), so it creates in
 * Personal, or the first team when personal accounts are off.
 */
export function createContext(
	current: WorkContext,
	contexts: readonly WorkContext[],
): WorkContext | undefined {
	if (current.kind !== "system") return current;
	return (
		contexts.find((c) => c.kind === "personal") ??
		contexts.find((c) => c.kind === "team") ??
		contexts.find((c) => c.kind === "project")
	);
}

/** The owner a create sends; personal sends none, so the row lands in the caller's own scope. */
export function contextOwner(ctx: WorkContextRef): Owner | undefined {
	switch (ctx.kind) {
		case "personal":
			return undefined;
		case "system":
			return { kind: "system" };
		default:
			return { kind: ctx.kind, id: ctx.id };
	}
}

/** The `usable_by` filter value for pickers in this context. */
export function contextUsableBy(ctx: WorkContextRef): string {
	switch (ctx.kind) {
		case "personal":
			return `user:${ctx.id}`;
		case "system":
			return "system";
		default:
			return `${ctx.kind}:${ctx.id}`;
	}
}

/** The `usable_by` value for an existing row's owner; undefined where the filter has no form for it. */
export function ownerUsableBy(
	owner: Owner | undefined,
	actorUserId: string | undefined,
): string | undefined {
	const kind = owner?.kind ?? "user";
	if (kind === "system") return "system";
	if (kind === "user") {
		const id = owner?.id || actorUserId;
		return id ? `user:${id}` : undefined;
	}
	if ((kind === "team" || kind === "project") && owner?.id) {
		return `${kind}:${owner.id}`;
	}
	return undefined;
}

/** The switcher's name for a context; personal reads as such, not as the username. */
export function contextLabel(ctx: WorkContext): string {
	return ctx.kind === "personal" ? "Personal" : ctx.displayName;
}

/** The switcher trigger's main line; personal shows whose it is. */
export function contextTitle(ctx: WorkContext): string {
	return ctx.kind === "personal"
		? ctx.displayName || "Personal"
		: ctx.displayName;
}

/** A workspace's second line: your role in a team or project, else what it spans. */
export function contextSubtitle(ctx: WorkContext): string {
	switch (ctx.kind) {
		case "personal":
			return "Personal";
		case "system":
			return "All teams";
		default:
			return `${KIND_LABEL[ctx.kind]} ${ctx.admin ? "admin" : "member"}`;
	}
}

/** A switcher row's second line: whose your personal space is, else the subtitle. */
export function contextRowDetail(ctx: WorkContext): string {
	return ctx.kind === "personal" ? contextTitle(ctx) : contextSubtitle(ctx);
}

/** Up to two letters for a team or project's avatar: "Wyolet Relay" → "WR". */
export function contextInitials(ctx: WorkContext): string {
	const words = ctx.displayName
		.trim()
		.split(/[\s_-]+/)
		.filter(Boolean);
	const letters =
		words.length > 1
			? `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`
			: (words[0] ?? "").slice(0, 2);
	return letters.toUpperCase();
}

/** "Team Platform": the context a create lands in. */
export function contextName(ctx: WorkContext): string {
	switch (ctx.kind) {
		case "personal":
			return "Personal";
		case "system":
			return "Organization";
		default:
			return `${KIND_LABEL[ctx.kind]} ${ctx.displayName}`;
	}
}

/** Where an existing row sits, named from the caller's contexts when listed there. */
export function ownerName(
	owner: Owner | undefined,
	contexts: readonly WorkContext[],
	actorUserId: string | undefined,
): string {
	const kind = owner?.kind ?? "user";
	const id = owner?.id ?? "";
	if (kind === "system") return "System";
	if (kind === "user") {
		return !id || id === actorUserId ? "Personal" : `user ${id.slice(0, 8)}…`;
	}
	if (kind === "team" || kind === "project") {
		const listed = contexts.find((c) => c.kind === kind && c.id === id);
		if (listed) return contextName(listed);
		return `${KIND_LABEL[kind]} ${id.slice(0, 8)}…`;
	}
	return kind;
}

/** Where a form's row sits, as its identity line shows it. */
export interface FormPlacement {
	/** e.g. "Team Platform". */
	scope: string;
	/** A create placed by the workspace; its form may pick another one for itself. */
	editable: boolean;
	/** The context this form creates in, by {@link contextKey}. */
	contextKey?: string;
	/** Picks another context for this form only; the workspace stays as it is. */
	choose?: (key: string) => void;
}

/** A picker's owner-scoped list as a form reads it. */
export interface UsableList<T> {
	items: T[];
	/** False until any rows arrived, this scope's or the last one's. */
	loaded: boolean;
	/** The rows are the last scope's, shown while this scope's load. */
	fromPreviousScope: boolean;
}

/** Picks a create form keeps after a switch though its new scope can't use them. */
export interface UnavailablePicks {
	ids: string[];
	/** e.g. "Team Platform". */
	scope: string;
}

/** The picked ids not among the `usable` rows, in pick order. */
export function unusablePicks(
	picked: readonly string[],
	usable: readonly { metadata: { id?: string } }[],
): string[] {
	const allowed = new Set(usable.map((row) => row.metadata.id));
	return picked.filter((id) => !allowed.has(id));
}

/**
 * The picks a create form flags once `list` holds its current scope's rows;
 * undefined for edits, while the list loads, or when every pick is usable.
 */
export function unavailablePicks(
	picked: readonly string[],
	list: UsableList<{ metadata: { id?: string } }>,
	placement: FormPlacement | undefined,
): UnavailablePicks | undefined {
	if (!placement?.editable || !list.loaded || list.fromPreviousScope) {
		return undefined;
	}
	const ids = unusablePicks(picked, list.items);
	return ids.length > 0 ? { ids, scope: placement.scope } : undefined;
}

/** The scope a picker says it's updating for while any of its lists shows the last scope's rows. */
export function updatingScope(
	placement: FormPlacement | undefined,
	...lists: readonly { fromPreviousScope: boolean }[]
): string | undefined {
	return lists.some((l) => l.fromPreviousScope) ? placement?.scope : undefined;
}

/** The inline mark on a pick the scope can't use. */
export function notAvailableLabel(scope: string): string {
	return `Not available in ${scope}`;
}

/** The field error once a save was tried with flagged picks. */
export function unavailablePicksError(
	flagged: UnavailablePicks | undefined,
	submitTried: boolean,
): string | undefined {
	if (!flagged || !submitTried) return undefined;
	return `Remove what ${flagged.scope} can't use, or switch the workspace back.`;
}

export interface ContextRow {
	context: WorkContext;
	/** A project listed under its team. */
	nested: boolean;
}

/** Switcher rows: personal and System, each team followed by its projects, then projects whose team isn't listed. */
export function contextRows(contexts: readonly WorkContext[]): ContextRow[] {
	const teams = contexts.filter((c) => c.kind === "team");
	const projects = contexts.filter((c) => c.kind === "project");
	const teamIds = new Set(teams.map((t) => t.id));
	return [
		...contexts
			.filter((c) => c.kind === "personal" || c.kind === "system")
			.map((context) => ({ context, nested: false })),
		...teams.flatMap((team) => [
			{ context: team, nested: false },
			...projects
				.filter((p) => p.teamId === team.id)
				.map((context) => ({ context, nested: true })),
		]),
		...projects
			.filter((p) => !p.teamId || !teamIds.has(p.teamId))
			.map((context) => ({ context, nested: false })),
	];
}

/** Select options, valued by id, for the caller's teams or projects. */
export function scopeOptions(
	contexts: readonly WorkContext[],
	kind: "team" | "project",
): OwnerOption[] {
	return contexts
		.filter((c) => c.kind === kind)
		.map((c) => ({ value: c.id, kind, label: c.displayName }));
}

/** The team a project created in this context belongs to; undefined leaves the choice to the form. */
export function contextTeamId(ctx: WorkContext): string | undefined {
	if (ctx.kind === "team") return ctx.id;
	if (ctx.kind === "project") return ctx.teamId;
	return undefined;
}

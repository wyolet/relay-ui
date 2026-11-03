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
}

/** What the store keeps across reloads. */
export type WorkContextRef = Pick<WorkContext, "kind" | "id">;

export const SYSTEM_CONTEXT: WorkContext = {
	kind: "system",
	id: "",
	displayName: "System",
};

const KIND_LABEL: Record<"team" | "project", string> = {
	team: "Team",
	project: "Project",
};

/** The caller's contexts: personal first, System next for admins, then the rest in server order. */
export function workContexts(
	mine: readonly MyContext[],
	isAdmin: boolean,
): WorkContext[] {
	const listed = mine.map(
		(c): WorkContext => ({
			kind: c.kind,
			id: c.id,
			displayName: c.displayName,
			...(c.teamId ? { teamId: c.teamId } : {}),
		}),
	);
	if (!isAdmin) return listed;
	return [
		...listed.filter((c) => c.kind === "personal"),
		SYSTEM_CONTEXT,
		...listed.filter((c) => c.kind !== "personal"),
	];
}

/** One string per context, for radio values and keys. */
export function contextKey(ctx: WorkContextRef): string {
	return `${ctx.kind}:${ctx.id}`;
}

/** The stored context while the caller still has it, else the first one. */
export function resolveWorkContext(
	contexts: readonly WorkContext[],
	stored: WorkContextRef | null,
): WorkContext | undefined {
	const kept = stored
		? contexts.find((c) => contextKey(c) === contextKey(stored))
		: undefined;
	return kept ?? contexts[0];
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

/** The switcher trigger's second line: a project's team, else the kind. */
export function contextSubtitle(
	ctx: WorkContext,
	contexts: readonly WorkContext[],
): string {
	switch (ctx.kind) {
		case "personal":
			return "Personal";
		case "system":
			return "Relay-wide";
		case "team":
			return KIND_LABEL.team;
		case "project":
			return (
				contexts.find((c) => c.kind === "team" && c.id === ctx.teamId)
					?.displayName ?? KIND_LABEL.project
			);
	}
}

/** "Team Platform": the context a create lands in. */
export function contextName(ctx: WorkContext): string {
	switch (ctx.kind) {
		case "personal":
			return "Personal";
		case "system":
			return "System";
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
	/** Placed by the work context, so switching the context moves the create. */
	editable: boolean;
	/** Why picks were cleared after a switch. */
	note?: string;
}

/** The note a create form shows once a switch dropped picks. */
export function scopeSwitchNote(scope: string): string {
	return `Switched to ${scope}; picks that ${scope} can't use were cleared.`;
}

/** The picked ids still among the `usable` rows, in pick order. */
export function usablePicks(
	picked: readonly string[],
	usable: readonly { metadata: { id?: string } }[],
): string[] {
	const allowed = new Set(usable.map((row) => row.metadata.id));
	return picked.filter((id) => allowed.has(id));
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

import type { components } from "@/api/types.gen";

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

/** "In Team Platform": where a create in this context lands. */
export function contextPlacement(ctx: WorkContext): string {
	switch (ctx.kind) {
		case "personal":
			return "In Personal";
		case "system":
			return "In System";
		default:
			return `In ${KIND_LABEL[ctx.kind]} ${ctx.displayName}`;
	}
}

/** Where an existing row sits, named from the caller's contexts when listed there. */
export function ownerPlacement(
	owner: Owner | undefined,
	contexts: readonly WorkContext[],
	actorUserId: string | undefined,
): string {
	const kind = owner?.kind ?? "user";
	const id = owner?.id ?? "";
	if (kind === "system") return "In System";
	if (kind === "user") {
		return !id || id === actorUserId
			? "In Personal"
			: `In user ${id.slice(0, 8)}…`;
	}
	if (kind === "team" || kind === "project") {
		const listed = contexts.find((c) => c.kind === kind && c.id === id);
		if (listed) return contextPlacement(listed);
		return `In ${KIND_LABEL[kind]} ${id.slice(0, 8)}…`;
	}
	return `In ${kind}`;
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

/** The team a project created in this context belongs to; undefined leaves the choice to the form. */
export function contextTeamId(ctx: WorkContext): string | undefined {
	if (ctx.kind === "team") return ctx.id;
	if (ctx.kind === "project") return ctx.teamId;
	return undefined;
}

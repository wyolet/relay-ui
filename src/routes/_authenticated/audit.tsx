import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import {
	type AuditFilter,
	auditInfiniteQueryOptions,
	useAuditFacets,
} from "@/api/hooks/audit";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import { teamsListQueryOptions } from "@/api/hooks/teams";
import { type AuditFilterValues, AuditFilters } from "@/audit/AuditFilters";
import { type AuditFilterKey, AuditTable } from "@/audit/AuditTable";
import {
	RANGE_VALUES,
	rangeBounds,
	STATUS_VALUES,
} from "@/audit/auditFilterConfig";
import { PageLoader } from "@/shared/Spinner";

const searchSchema = z.object({
	span: z.enum(RANGE_VALUES).catch("24h").default("24h"),
	/** Custom-range bounds as `datetime-local` values (local wall time). */
	from: z.string().default(""),
	to: z.string().default(""),
	actor: z.string().default(""),
	action: z.array(z.string()).default([]),
	kind: z.array(z.string()).default([]),
	scope: z.array(z.string()).default([]),
	outcome: z.enum(STATUS_VALUES).catch("").default(""),
	expand: z.string().optional(),
});

type AuditSearch = z.infer<typeof searchSchema>;

/** Map URL search onto the server-side /audit query. Every facet is a server
 * filter — nothing here is refined client-side. */
function toAuditFilter(s: AuditSearch): AuditFilter {
	const filter: AuditFilter = rangeBounds(s.span, s.from, s.to);
	const actor = s.actor.trim();
	if (actor) filter.actor_name = actor;
	if (s.action.length) filter.action = s.action;
	if (s.kind.length) filter.resource_kind = s.kind;
	if (s.scope.length) filter.scope = s.scope;
	if (s.outcome) filter.status = s.outcome;
	return filter;
}

export const Route = createFileRoute("/_authenticated/audit")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => search,
	loader: ({ context, deps }) =>
		Promise.all([
			context.queryClient.ensureInfiniteQueryData(
				auditInfiniteQueryOptions(toAuditFilter(deps)),
			),
			context.queryClient.ensureQueryData(teamsListQueryOptions),
			context.queryClient.ensureQueryData(projectsListQueryOptions),
		]),
	component: AuditPage,
});

function AuditPage() {
	const search = Route.useSearch();
	const { expand } = search;
	const navigate = useNavigate();
	const filter = toAuditFilter(search);
	const facets = useAuditFacets(
		rangeBounds(search.span, search.from, search.to),
	);

	const patch = (next: Partial<AuditSearch>) =>
		void navigate({ to: "/audit", search: (prev) => ({ ...prev, ...next }) });

	// The filter bar speaks its own vocabulary; `span`/`outcome` are the URL
	// keys, kept distinct from the identically-named ones other routes own.
	const patchFilters = (next: Partial<AuditFilterValues>) => {
		const { range, status, ...rest } = next;
		patch({
			...rest,
			...(range !== undefined && { span: range }),
			...(status !== undefined && { outcome: status }),
		});
	};

	// Click-to-filter from a table cell: append to a facet, or set the actor.
	const addFilter = (key: AuditFilterKey, value: string) => {
		if (key === "actor") {
			patch({ actor: value });
			return;
		}
		const cur = search[key];
		if (!cur.includes(value)) patch({ [key]: [...cur, value] });
	};

	return (
		<div className="flex flex-col gap-4">
			<div>
				<h1 className="text-xl font-semibold text-foreground">Audit</h1>
				<p className="text-xs text-muted-foreground">
					Who changed what on the control plane, newest first — every mutation,
					every denial, every login. A change lists the fields it touched;
					values are never recorded.
				</p>
			</div>

			<AuditFilters
				values={{
					range: search.span,
					status: search.outcome,
					from: search.from,
					to: search.to,
					actor: search.actor,
					action: search.action,
					kind: search.kind,
					scope: search.scope,
				}}
				actions={facets.actions}
				kinds={facets.kinds}
				onChange={patchFilters}
			/>

			<Suspense fallback={<Loading />}>
				<AuditTable
					filter={filter}
					expandedId={expand ?? null}
					onToggle={(id) => patch({ expand: expand === id ? undefined : id })}
					onFilter={addFilter}
				/>
			</Suspense>
		</div>
	);
}

function Loading() {
	return (
		<div className="rounded-lg border border-border bg-card">
			<PageLoader />
		</div>
	);
}

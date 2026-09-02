import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Boxes, Plus } from "lucide-react";
import {
	type ProjectsListParams,
	useDeleteProject,
	useProjectsList,
} from "@/api/hooks/projects";
import { useTeams } from "@/api/hooks/teams";
import { ApiError } from "@/api/types/errors";
import type { Project } from "@/api/types/project";
import { buttonVariants } from "@/components/ui/button";
import { FilterBar } from "@/filters/FilterBar";
import { activeFilterCount } from "@/filters/toQueryParams";
import type { FilterDef, FilterState } from "@/filters/types";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { useToggleProjectEnabled } from "@/projects/useToggleProjectEnabled";
import { confirm } from "@/shared/ConfirmDialog";
import { RowMenu } from "@/shared/RowMenu";
import { Switch } from "@/shared/Switch";
import { TableToolbar } from "@/shared/TableToolbar";
import { Th } from "@/shared/Th";
import { toast } from "@/shared/Toast";
import { budgetSummary } from "@/teams/budget";

/** Filters rendered above the table, all served by GET /projects. */
export const PROJECT_FILTERS = [
	{
		key: "q",
		type: "search",
		label: "Search",
		placeholder: "Search projects",
		default: "",
	},
	{
		key: "enabled",
		type: "select",
		label: "Status",
		default: "all",
		options: [
			{ value: "all", label: "Any status" },
			{ value: "true", label: "Enabled" },
			{ value: "false", label: "Disabled" },
		],
	},
] as const satisfies readonly FilterDef[];

/** Map the route's filter state onto GET /projects query params. */
export function toProjectsParams(search: {
	q: string;
	enabled: "all" | "true" | "false";
	team_id: string;
}): ProjectsListParams {
	const params: ProjectsListParams = {};
	const q = search.q.trim();
	if (q) params.q = q;
	if (search.enabled !== "all") params.enabled = search.enabled === "true";
	if (search.team_id) params.team_id = [search.team_id];
	return params;
}

export function ProjectsTable() {
	const navigate = useNavigate({ from: "/projects" });
	const search = useSearch({ from: "/_authenticated/projects/" });
	const { data } = useProjectsList(toProjectsParams(search));
	const { data: teamsData } = useTeams();
	const deleteProject = useDeleteProject();
	const { setEnabled } = useToggleProjectEnabled();

	const teams = new Map<string, { name: string; label: string }>();
	for (const t of teamsData.items ?? []) {
		if (t.metadata.id)
			teams.set(t.metadata.id, {
				name: t.metadata.name,
				label: displayLabel(t.metadata),
			});
	}

	const items = data.items ?? [];
	const filtered = activeFilterCount(PROJECT_FILTERS, { ...search }) > 0;

	function patch(next: FilterState) {
		void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true });
	}

	async function handleDelete(project: Project) {
		const ok = await confirm({
			title: `Delete ${displayLabel(project.metadata)}?`,
			description: "Its service accounts, keys, and policies go with it.",
			confirmLabel: "Delete",
			danger: true,
		});
		if (!ok) return;
		try {
			await deleteProject.mutateAsync(project.metadata.id ?? "");
			toast("success", `Project "${displayLabel(project.metadata)}" deleted.`);
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError
					? err.body.message
					: "Failed to delete project.",
			);
		}
	}

	return (
		<div>
			<TableToolbar
				search={
					<FilterBar
						defs={PROJECT_FILTERS}
						state={{ q: search.q, enabled: search.enabled }}
						onChange={patch}
					/>
				}
				actions={
					<Link
						to="/projects/new"
						className={buttonVariants({ variant: "default", size: "lg" })}
					>
						<Plus className="w-3.5 h-3.5" />
						New project
					</Link>
				}
			/>

			{items.length === 0 ? (
				<div className="rounded-lg border border-dashed border-input bg-card px-6 py-14 text-center">
					<Boxes className="w-6 h-6 mx-auto mb-3 text-muted-foreground/50" />
					{!filtered ? (
						<>
							<p className="text-sm font-medium text-foreground mb-1">
								No projects yet
							</p>
							<p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
								A project lives in a team and owns the service accounts, keys,
								and policies that author requests.
							</p>
							<Link
								to="/projects/new"
								className={buttonVariants({ variant: "default", size: "lg" })}
							>
								<Plus className="w-4 h-4" />
								Create project
							</Link>
						</>
					) : (
						<p className="text-sm text-muted-foreground">
							No projects match this filter.
						</p>
					)}
				</div>
			) : (
				<div className="overflow-x-auto rounded-lg border border-border bg-card">
					<table className="w-full border-collapse">
						<thead className="bg-muted/40">
							<tr>
								<Th variant="column">Name</Th>
								<Th variant="column">Team</Th>
								<Th variant="column">Budget</Th>
								<th
									scope="col"
									className="w-12 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
								>
									On
								</th>
								<th
									scope="col"
									className="w-10 px-3 py-2"
									aria-label="Actions"
								/>
							</tr>
						</thead>
						<tbody>
							{items.map((project) => {
								const enabled = project.spec.enabled ?? true;
								const team = teams.get(project.spec.teamId);
								return (
									<tr
										key={project.metadata.name}
										className={[
											"border-t border-border transition-colors",
											enabled
												? "hover:bg-muted/40"
												: "bg-muted/30 text-muted-foreground/70",
										].join(" ")}
									>
										<td className="px-3 py-2">
											<Link
												to="/projects/$name"
												params={{ name: project.metadata.name }}
												className="text-sm font-medium text-foreground hover:underline"
											>
												{displayLabel(project.metadata)}
											</Link>
											{hasDisplayName(project.metadata) && (
												<div className="font-mono text-[11px] text-muted-foreground">
													{project.metadata.name}
												</div>
											)}
										</td>
										<td className="px-3 py-2 text-xs text-foreground">
											{team ? (
												<Link
													to="/teams/$name"
													params={{ name: team.name }}
													className="hover:underline"
												>
													{team.label}
												</Link>
											) : (
												`Unknown (${project.spec.teamId.slice(0, 6)}…)`
											)}
										</td>
										<td className="px-3 py-2 text-xs text-foreground">
											{budgetSummary(project.spec.budget) ?? "—"}
										</td>
										<td className="px-3 py-2">
											<Switch
												checked={enabled}
												onChange={(next) => void setEnabled(project, next)}
												label={`Toggle ${project.metadata.name}`}
											/>
										</td>
										<td className="px-3 py-2 text-right">
											<RowMenu
												actions={[
													{
														label: "Edit",
														render: (
															<Link
																to="/projects/$name/edit"
																params={{ name: project.metadata.name }}
															/>
														),
													},
													{
														label: "Delete",
														danger: true,
														onClick: () => void handleDelete(project),
													},
												]}
											/>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

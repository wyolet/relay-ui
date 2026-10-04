import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Plus, Users } from "lucide-react";
import {
	type TeamsListParams,
	useDeleteTeam,
	useTeamsList,
} from "@/api/hooks/teams";
import { ApiError } from "@/api/types/errors";
import type { Team } from "@/api/types/team";
import { buttonVariants } from "@/components/ui/button";
import { FilterBar } from "@/filters/FilterBar";
import { activeFilterCount } from "@/filters/toQueryParams";
import type { FilterDef, FilterState } from "@/filters/types";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { confirm } from "@/shared/ConfirmDialog";
import { RowMenu } from "@/shared/RowMenu";
import { Switch } from "@/shared/Switch";
import { TableToolbar } from "@/shared/TableToolbar";
import { Th } from "@/shared/Th";
import { toast } from "@/shared/Toast";
import { budgetSummary } from "@/teams/budget";
import { useToggleTeamEnabled } from "@/teams/useToggleTeamEnabled";

/** Filters rendered above the table, all served by GET /teams. */
export const TEAM_FILTERS = [
	{
		key: "q",
		type: "search",
		label: "Search",
		placeholder: "Search teams",
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

/** Map the route's filter state onto GET /teams query params. */
export function toTeamsParams(search: {
	q: string;
	enabled: "all" | "true" | "false";
}): TeamsListParams {
	const params: TeamsListParams = {};
	const q = search.q.trim();
	if (q) params.q = q;
	if (search.enabled !== "all") params.enabled = search.enabled === "true";
	return params;
}

export function TeamsTable() {
	const navigate = useNavigate({ from: "/teams" });
	const search = useSearch({ from: "/_authenticated/teams/" });
	const { data } = useTeamsList(toTeamsParams(search));
	const deleteTeam = useDeleteTeam();
	const { setEnabled } = useToggleTeamEnabled();

	const items = data.items ?? [];
	const filtered = activeFilterCount(TEAM_FILTERS, { ...search }) > 0;

	function patch(next: FilterState) {
		void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true });
	}

	async function handleDelete(team: Team) {
		const ok = await confirm({
			title: `Delete ${displayLabel(team.metadata)}?`,
			description: "Its projects and everything they own go with it.",
			confirmLabel: "Delete",
			danger: true,
		});
		if (!ok) return;
		try {
			await deleteTeam.mutateAsync(team.metadata.id ?? "");
			toast("success", `Team "${displayLabel(team.metadata)}" deleted.`);
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError ? err.body.message : "Failed to delete team.",
			);
		}
	}

	return (
		<div>
			<TableToolbar
				search={
					<FilterBar
						defs={TEAM_FILTERS}
						state={{ q: search.q, enabled: search.enabled }}
						onChange={patch}
					/>
				}
				actions={
					<Link
						to="/teams/new"
						className={buttonVariants({ variant: "default", size: "lg" })}
					>
						<Plus className="w-3.5 h-3.5" />
						New team
					</Link>
				}
			/>

			{items.length === 0 ? (
				<div className="rounded-lg border border-dashed border-input bg-card px-6 py-14 text-center">
					<Users className="w-6 h-6 mx-auto mb-3 text-muted-foreground/50" />
					{!filtered ? (
						<>
							<p className="text-sm font-medium text-foreground mb-1">
								No teams yet
							</p>
							<p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
								A team is the outer tenancy scope. It owns projects, and
								membership is granted by a role binding at team scope.
							</p>
							<Link
								to="/teams/new"
								className={buttonVariants({ variant: "default", size: "lg" })}
							>
								<Plus className="w-4 h-4" />
								Create team
							</Link>
						</>
					) : (
						<p className="text-sm text-muted-foreground">
							No teams match this filter.
						</p>
					)}
				</div>
			) : (
				<div className="overflow-x-auto rounded-lg border border-border bg-card">
					<table className="w-full border-collapse">
						<thead className="bg-muted/40">
							<tr>
								<Th variant="column">Name</Th>
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
							{items.map((team) => {
								const enabled = team.spec.enabled ?? true;
								return (
									<tr
										key={team.metadata.name}
										className={[
											"border-t border-border transition-colors",
											enabled
												? "hover:bg-muted/40"
												: "bg-muted/30 text-muted-foreground/70",
										].join(" ")}
									>
										<td className="px-3 py-2">
											<Link
												to="/teams/$name"
												params={{ name: team.metadata.name }}
												className="text-sm font-medium text-foreground hover:underline"
											>
												{displayLabel(team.metadata)}
											</Link>
											{hasDisplayName(team.metadata) && (
												<div className="font-mono text-[11px] text-muted-foreground">
													{team.metadata.name}
												</div>
											)}
										</td>
										<td className="px-3 py-2 text-xs text-foreground">
											{budgetSummary(team.spec.budget) ?? "—"}
										</td>
										<td className="px-3 py-2">
											<Switch
												checked={enabled}
												onChange={(next) => void setEnabled(team, next)}
												label={`Toggle ${team.metadata.name}`}
											/>
										</td>
										<td className="px-3 py-2 text-right">
											<RowMenu
												actions={[
													{
														label: "Edit",
														render: (
															<Link
																to="/teams/$name/edit"
																params={{ name: team.metadata.name }}
															/>
														),
													},
													{
														label: "Delete",
														danger: true,
														onClick: () => void handleDelete(team),
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

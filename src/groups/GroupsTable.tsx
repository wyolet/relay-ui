import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Plus, Users } from "lucide-react";
import {
	type GroupsListParams,
	useDeleteGroup,
	useGroupsList,
} from "@/api/hooks/groups";
import { ApiError } from "@/api/types/errors";
import type { Group } from "@/api/types/group";
import { buttonVariants } from "@/components/ui/button";
import { FilterBar } from "@/filters/FilterBar";
import { activeFilterCount } from "@/filters/toQueryParams";
import type { FilterDef, FilterState } from "@/filters/types";
import { useToggleGroupEnabled } from "@/groups/useToggleGroupEnabled";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { confirm } from "@/shared/ConfirmDialog";
import { RowMenu } from "@/shared/RowMenu";
import { Switch } from "@/shared/Switch";
import { TableToolbar } from "@/shared/TableToolbar";
import { Th } from "@/shared/Th";
import { toast } from "@/shared/Toast";

/** Filters rendered above the table, all served by GET /groups. */
export const GROUP_FILTERS = [
	{
		key: "q",
		type: "search",
		label: "Search",
		placeholder: "Search groups",
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

/** Map the route's filter state onto GET /groups query params. */
export function toGroupsParams(search: {
	q: string;
	enabled: "all" | "true" | "false";
}): GroupsListParams {
	const params: GroupsListParams = {};
	const q = search.q.trim();
	if (q) params.q = q;
	if (search.enabled !== "all") params.enabled = search.enabled === "true";
	return params;
}

export function GroupsTable() {
	const navigate = useNavigate({ from: "/groups" });
	const search = useSearch({ from: "/_authenticated/groups/" });
	const { data } = useGroupsList(toGroupsParams(search));
	const deleteGroup = useDeleteGroup();
	const { setEnabled } = useToggleGroupEnabled();

	const items = data.items ?? [];
	const filtered = activeFilterCount(GROUP_FILTERS, { ...search }) > 0;

	function patch(next: FilterState) {
		void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true });
	}

	async function handleDelete(g: Group) {
		const ok = await confirm({
			title: `Delete ${displayLabel(g.metadata)}?`,
			description: "Bindings that name this group stop matching its members.",
			confirmLabel: "Delete",
			danger: true,
		});
		if (!ok) return;
		try {
			await deleteGroup.mutateAsync(g.metadata.id ?? "");
			toast("success", `Group "${displayLabel(g.metadata)}" deleted.`);
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError ? err.body.message : "Failed to delete group.",
			);
		}
	}

	return (
		<div>
			<TableToolbar
				search={
					<FilterBar
						defs={GROUP_FILTERS}
						state={{ q: search.q, enabled: search.enabled }}
						onChange={patch}
					/>
				}
				actions={
					<Link
						to="/groups/new"
						className={buttonVariants({ variant: "default", size: "lg" })}
					>
						<Plus className="w-3.5 h-3.5" />
						New group
					</Link>
				}
			/>

			{items.length === 0 ? (
				<div className="rounded-lg border border-dashed border-input bg-card px-6 py-14 text-center">
					<Users className="w-6 h-6 mx-auto mb-3 text-muted-foreground/50" />
					{!filtered ? (
						<>
							<p className="text-sm font-medium text-foreground mb-1">
								No groups yet
							</p>
							<p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
								A group is a named set of users that bindings can name as a
								subject. Identity-provider groups of the same name union with
								it.
							</p>
							<Link
								to="/groups/new"
								className={buttonVariants({ variant: "default", size: "lg" })}
							>
								<Plus className="w-4 h-4" />
								Create group
							</Link>
						</>
					) : (
						<p className="text-sm text-muted-foreground">
							No groups match this filter.
						</p>
					)}
				</div>
			) : (
				<div className="overflow-x-auto rounded-lg border border-border bg-card">
					<table className="w-full border-collapse">
						<thead className="bg-muted/40">
							<tr>
								<Th variant="column">Name</Th>
								<Th variant="column">Members</Th>
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
							{items.map((g) => {
								const enabled = g.spec.enabled ?? true;
								return (
									<tr
										key={g.metadata.name}
										className={[
											"border-t border-border transition-colors",
											enabled
												? "hover:bg-muted/40"
												: "bg-muted/30 text-muted-foreground/70",
										].join(" ")}
									>
										<td className="px-3 py-2">
											<Link
												to="/groups/$name"
												params={{ name: g.metadata.name }}
												className="text-sm font-medium text-foreground hover:underline"
											>
												{displayLabel(g.metadata)}
											</Link>
											{hasDisplayName(g.metadata) && (
												<div className="font-mono text-[11px] text-muted-foreground">
													{g.metadata.name}
												</div>
											)}
										</td>
										<td className="px-3 py-2 text-xs text-foreground tabular-nums">
											{g.spec.memberIds?.length ?? 0}
										</td>
										<td className="px-3 py-2">
											<Switch
												checked={enabled}
												onChange={(next) => void setEnabled(g, next)}
												label={`Toggle ${g.metadata.name}`}
											/>
										</td>
										<td className="px-3 py-2 text-right">
											<RowMenu
												actions={[
													{
														label: "Edit",
														render: (
															<Link
																to="/groups/$name/edit"
																params={{ name: g.metadata.name }}
															/>
														),
													},
													{
														label: "Delete",
														danger: true,
														onClick: () => void handleDelete(g),
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

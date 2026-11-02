import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Plus, ShieldCheck } from "lucide-react";
import {
	FEATURE_CUSTOM_ROLES,
	useHasLicenseFeature,
} from "@/api/hooks/license";
import {
	type RolesListParams,
	useDeleteRole,
	useRolesList,
} from "@/api/hooks/roles";
import { Button, buttonVariants } from "@/components/ui/button";
import { FilterBar } from "@/filters/FilterBar";
import { activeFilterCount } from "@/filters/toQueryParams";
import type { FilterDef, FilterState } from "@/filters/types";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { CustomRolesNotice } from "@/roles/CustomRolesNotice";
import { ruleSummary } from "@/roles/RuleChips";
import { isBuiltinRole } from "@/roles/vocabulary";
import { Chip } from "@/shared/Chip";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { RowMenu } from "@/shared/RowMenu";
import { StaleContent } from "@/shared/StaleContent";
import { TableEmpty } from "@/shared/TableEmpty";
import { TableToolbar } from "@/shared/TableToolbar";
import { Th } from "@/shared/Th";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";
import { useDeferredSearch } from "@/shared/useDeferredSearch";

/** Filters rendered above the table, all served by GET /roles. */
export const ROLE_FILTERS = [
	{
		key: "q",
		type: "search",
		label: "Search",
		placeholder: "Search roles",
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

/** Map the route's filter state onto GET /roles query params. */
export function toRolesParams(search: {
	q: string;
	enabled: "all" | "true" | "false";
}): RolesListParams {
	const params: RolesListParams = {};
	const q = search.q.trim();
	if (q) params.q = q;
	if (search.enabled !== "all") params.enabled = search.enabled === "true";
	return params;
}

export function RolesTable() {
	const navigate = useNavigate({ from: "/roles" });
	const live = useSearch({ from: "/_authenticated/roles/" });
	const { search, isStale } = useDeferredSearch(live);
	const { data } = useRolesList(toRolesParams(search));
	const canAuthor = useHasLicenseFeature(FEATURE_CUSTOM_ROLES);
	const del = useConfirmedDelete(useDeleteRole(), { noun: "role" });

	const items = data.items ?? [];
	const filtered = activeFilterCount(ROLE_FILTERS, { ...search }) > 0;

	function patch(next: FilterState) {
		void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true });
	}

	return (
		<div>
			<TableToolbar
				search={
					<FilterBar
						defs={ROLE_FILTERS}
						state={{ q: live.q, enabled: live.enabled }}
						onChange={patch}
					/>
				}
				actions={
					canAuthor ? (
						<Link
							to="/roles/new"
							className={buttonVariants({ variant: "default", size: "lg" })}
						>
							<Plus className="w-3.5 h-3.5" />
							New role
						</Link>
					) : (
						<Button size="lg" disabled>
							<Plus className="w-3.5 h-3.5" />
							New role
						</Button>
					)
				}
			/>

			{!canAuthor && (
				<div className="mb-3">
					<CustomRolesNotice />
				</div>
			)}

			<StaleContent stale={isStale}>
				{items.length === 0 ? (
					<TableEmpty icon={ShieldCheck}>
						<p className="text-sm text-muted-foreground">
							{filtered ? "No roles match this filter." : "No roles yet."}
						</p>
					</TableEmpty>
				) : (
					<div className="overflow-x-auto rounded-lg border border-border bg-card">
						<table className="w-full border-collapse">
							<thead className="bg-muted/40">
								<tr>
									<Th variant="column">Name</Th>
									<Th variant="column">Rules</Th>
									<th
										scope="col"
										className="w-10 px-3 py-2"
										aria-label="Actions"
									/>
								</tr>
							</thead>
							<tbody>
								{items.map((role) => {
									const builtin = isBuiltinRole(role.metadata.owner?.kind);
									return (
										<tr
											key={role.metadata.name}
											className="border-t border-border transition-colors hover:bg-muted/40"
										>
											<td className="px-3 py-2">
												<div className="flex items-center gap-2">
													<Link
														to="/roles/$name"
														params={{ name: role.metadata.name }}
														className="text-sm font-medium text-foreground hover:underline"
													>
														{displayLabel(role.metadata)}
													</Link>
													{builtin && <Chip label="built-in" shape="box" />}
												</div>
												{hasDisplayName(role.metadata) && (
													<div className="font-mono text-[11px] text-muted-foreground">
														{role.metadata.name}
													</div>
												)}
											</td>
											<td className="px-3 py-2 text-xs text-muted-foreground">
												{ruleSummary(role.spec.rules)}
											</td>
											<td className="px-3 py-2 text-right">
												{builtin ? null : (
													<RowMenu
														actions={[
															{
																label: "Edit",
																render: (
																	<Link
																		to="/roles/$name/edit"
																		params={{ name: role.metadata.name }}
																	/>
																),
															},
															{
																label: "Delete",
																danger: true,
																onClick: () =>
																	del.request({
																		id: role.metadata.id ?? "",
																		name: role.metadata.name,
																		label: displayLabel(role.metadata),
																	}),
															},
														]}
													/>
												)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</StaleContent>
			{del.target && (
				<DeleteConfirm
					resourceName={del.target.name}
					onConfirm={() => void del.confirm()}
					onCancel={del.cancel}
					isPending={del.isPending}
					error={del.error}
				/>
			)}
		</div>
	);
}

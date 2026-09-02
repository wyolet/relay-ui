import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Plus, ShieldCheck } from "lucide-react";
import { useProjects } from "@/api/hooks/projects";
import {
	type RoleBindingsListParams,
	useDeleteRoleBinding,
	useRoleBindingsList,
} from "@/api/hooks/roleBindings";
import { useRoles } from "@/api/hooks/roles";
import { useTeams } from "@/api/hooks/teams";
import { ApiError } from "@/api/types/errors";
import type { RoleBinding } from "@/api/types/roleBinding";
import { buttonVariants } from "@/components/ui/button";
import { FilterBar } from "@/filters/FilterBar";
import { activeFilterCount } from "@/filters/toQueryParams";
import type { FilterDef, FilterState } from "@/filters/types";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { OwnerLink } from "@/projects/OwnerLink";
import { subjectLabel } from "@/role-bindings/SubjectsEditor";
import { Chip } from "@/shared/Chip";
import { confirm } from "@/shared/ConfirmDialog";
import { RowMenu } from "@/shared/RowMenu";
import { TableToolbar } from "@/shared/TableToolbar";
import { Th } from "@/shared/Th";
import { toast } from "@/shared/Toast";

export interface RoleBindingsSearch {
	q: string;
	role_id: string;
	scope_kind: "all" | "system" | "team" | "project";
	scope_id: string;
	subject: string;
}

/** Static filters; the role and scope pickers are appended at render time
 * because their options come from the catalog. */
const STATIC_FILTERS = [
	{
		key: "q",
		type: "search",
		label: "Search",
		placeholder: "Search role bindings",
		default: "",
	},
	{
		key: "scope_kind",
		type: "select",
		label: "Scope",
		default: "all",
		options: [
			{ value: "all", label: "Any scope" },
			{ value: "system", label: "Global" },
			{ value: "team", label: "Team" },
			{ value: "project", label: "Project" },
		],
	},
	{
		key: "subject",
		type: "search",
		label: "Subject",
		placeholder: "user:… / group:…",
		default: "",
	},
] as const satisfies readonly FilterDef[];

/** Map the route's filter state onto GET /role-bindings query params. */
export function toRoleBindingsParams(
	search: RoleBindingsSearch,
): RoleBindingsListParams {
	const params: RoleBindingsListParams = {};
	const q = search.q.trim();
	if (q) params.q = q;
	if (search.role_id) params.role_id = [search.role_id];
	if (search.scope_kind !== "all") params.scope_kind = search.scope_kind;
	if (search.scope_id) params.scope_id = [search.scope_id];
	const subject = search.subject.trim();
	if (subject) params.subject = [subject];
	return params;
}

export function RoleBindingsTable() {
	const navigate = useNavigate({ from: "/role-bindings" });
	const search = useSearch({ from: "/_authenticated/role-bindings/" });
	const { data } = useRoleBindingsList(toRoleBindingsParams(search));
	const { data: rolesData } = useRoles();
	const { data: teamsData } = useTeams();
	const { data: projectsData } = useProjects();
	const deleteBinding = useDeleteRoleBinding();

	const roleNames = new Map(
		(rolesData.items ?? []).map((r) => [
			r.metadata.id ?? "",
			{ name: r.metadata.name, label: displayLabel(r.metadata) },
		]),
	);

	const filters: FilterDef[] = [
		...STATIC_FILTERS,
		{
			key: "role_id",
			type: "select",
			label: "Role",
			default: "",
			options: [
				{ value: "", label: "Any role" },
				...(rolesData.items ?? []).map((r) => ({
					value: r.metadata.id ?? "",
					label: displayLabel(r.metadata),
				})),
			],
		},
		{
			key: "scope_id",
			type: "select",
			label: "Target",
			default: "",
			options: [
				{ value: "", label: "Any target" },
				...(teamsData.items ?? []).map((t) => ({
					value: t.metadata.id ?? "",
					label: `Team · ${displayLabel(t.metadata)}`,
				})),
				...(projectsData.items ?? []).map((p) => ({
					value: p.metadata.id ?? "",
					label: `Project · ${displayLabel(p.metadata)}`,
				})),
			],
		},
	];

	const items = data.items ?? [];
	const filtered = activeFilterCount(filters, { ...search }) > 0;

	function patch(next: FilterState) {
		void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true });
	}

	async function handleDelete(binding: RoleBinding) {
		const ok = await confirm({
			title: `Delete ${displayLabel(binding.metadata)}?`,
			description: "Its subjects lose the access this binding granted.",
			confirmLabel: "Delete",
			danger: true,
		});
		if (!ok) return;
		try {
			await deleteBinding.mutateAsync(binding.metadata.id ?? "");
			toast(
				"success",
				`Role binding "${displayLabel(binding.metadata)}" deleted.`,
			);
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError
					? err.body.message
					: "Failed to delete role binding.",
			);
		}
	}

	return (
		<div>
			<TableToolbar
				search={
					<FilterBar defs={filters} state={{ ...search }} onChange={patch} />
				}
				actions={
					<Link
						to="/role-bindings/new"
						className={buttonVariants({ variant: "default", size: "lg" })}
					>
						<Plus className="w-3.5 h-3.5" />
						New role binding
					</Link>
				}
			/>

			{items.length === 0 ? (
				<div className="rounded-lg border border-dashed border-input bg-card px-6 py-14 text-center">
					<ShieldCheck className="w-6 h-6 mx-auto mb-3 text-muted-foreground/50" />
					{!filtered ? (
						<>
							<p className="text-sm font-medium text-foreground mb-1">
								No role bindings yet
							</p>
							<p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
								A role binding grants one role to a set of subjects at one scope
								— global, a team, or a project.
							</p>
							<Link
								to="/role-bindings/new"
								className={buttonVariants({ variant: "default", size: "lg" })}
							>
								<Plus className="w-4 h-4" />
								Create role binding
							</Link>
						</>
					) : (
						<p className="text-sm text-muted-foreground">
							No role bindings match this filter.
						</p>
					)}
				</div>
			) : (
				<div className="overflow-x-auto rounded-lg border border-border bg-card">
					<table className="w-full border-collapse">
						<thead className="bg-muted/40">
							<tr>
								<Th variant="column">Name</Th>
								<Th variant="column">Role</Th>
								<Th variant="column">Scope</Th>
								<Th variant="column">Subjects</Th>
								<th
									scope="col"
									className="w-10 px-3 py-2"
									aria-label="Actions"
								/>
							</tr>
						</thead>
						<tbody>
							{items.map((binding) => {
								const role = roleNames.get(binding.spec.roleId);
								return (
									<tr
										key={binding.metadata.name}
										className="border-t border-border transition-colors hover:bg-muted/40"
									>
										<td className="px-3 py-2">
											<Link
												to="/role-bindings/$name"
												params={{ name: binding.metadata.name }}
												className="text-sm font-medium text-foreground hover:underline"
											>
												{displayLabel(binding.metadata)}
											</Link>
											{hasDisplayName(binding.metadata) && (
												<div className="font-mono text-[11px] text-muted-foreground">
													{binding.metadata.name}
												</div>
											)}
										</td>
										<td className="px-3 py-2 text-xs">
											{role ? (
												<Link
													to="/roles/$name"
													params={{ name: role.name }}
													className="text-foreground hover:underline"
												>
													{role.label}
												</Link>
											) : (
												<code className="font-mono text-[11px]">
													{binding.spec.roleId.slice(0, 8)}…
												</code>
											)}
										</td>
										<td className="px-3 py-2 text-xs">
											{binding.spec.scope.kind === "system" ? (
												<span className="text-muted-foreground">Global</span>
											) : (
												<OwnerLink owner={binding.spec.scope} />
											)}
										</td>
										<td className="px-3 py-2">
											<div className="flex flex-wrap gap-1">
												{(binding.spec.subjects ?? []).map((s) => (
													<Chip
														key={subjectLabel(s)}
														label={subjectLabel(s)}
														mono
														shape="box"
													/>
												))}
											</div>
										</td>
										<td className="px-3 py-2 text-right">
											<RowMenu
												actions={[
													{
														label: "Edit",
														render: (
															<Link
																to="/role-bindings/$name/edit"
																params={{ name: binding.metadata.name }}
															/>
														),
													},
													{
														label: "Delete",
														danger: true,
														onClick: () => void handleDelete(binding),
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

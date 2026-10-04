import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Plus, ShieldCheck } from "lucide-react";
import { usePolicies } from "@/api/hooks/policies";
import {
	type PolicyBindingsListParams,
	useDeletePolicyBinding,
	usePolicyBindingsList,
} from "@/api/hooks/policyBindings";
import { useProjects } from "@/api/hooks/projects";
import { ApiError } from "@/api/types/errors";
import type { PolicyBinding } from "@/api/types/policyBinding";
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

export interface PolicyBindingsSearch {
	q: string;
	project_id: string;
	/** Not `policy_id`: the logs route already owns that key as a list. */
	policy: string;
	subject: string;
}

/** Static filters; the project and policy pickers are appended at render
 * time because their options come from the catalog. */
const STATIC_FILTERS = [
	{
		key: "q",
		type: "search",
		label: "Search",
		placeholder: "Search policy bindings",
		default: "",
	},
	{
		key: "subject",
		type: "search",
		label: "Subject",
		placeholder: "user:… / group:…",
		default: "",
	},
] as const satisfies readonly FilterDef[];

/** Map the route's filter state onto GET /policy-bindings query params. */
export function toPolicyBindingsParams(
	search: PolicyBindingsSearch,
): PolicyBindingsListParams {
	const params: PolicyBindingsListParams = {};
	const q = search.q.trim();
	if (q) params.q = q;
	if (search.project_id) params.project_id = [search.project_id];
	if (search.policy) params.policy_id = [search.policy];
	const subject = search.subject.trim();
	if (subject) params.subject = [subject];
	return params;
}

export function PolicyBindingsTable() {
	const navigate = useNavigate({ from: "/policy-bindings" });
	const search = useSearch({ from: "/_authenticated/policy-bindings/" });
	const { data } = usePolicyBindingsList(toPolicyBindingsParams(search));
	const { data: projectsData } = useProjects();
	const { data: policiesData } = usePolicies();
	const deleteBinding = useDeletePolicyBinding();

	const policyNames = new Map(
		(policiesData.items ?? []).map((p) => [
			p.metadata.id ?? "",
			{ name: p.metadata.name, label: displayLabel(p.metadata) },
		]),
	);

	const filters: FilterDef[] = [
		...STATIC_FILTERS,
		{
			key: "project_id",
			type: "select",
			label: "Project",
			default: "",
			options: [
				{ value: "", label: "Any project" },
				...(projectsData.items ?? []).map((p) => ({
					value: p.metadata.id ?? "",
					label: displayLabel(p.metadata),
				})),
			],
		},
		{
			key: "policy",
			type: "select",
			label: "Policy",
			default: "",
			options: [
				{ value: "", label: "Any policy" },
				...(policiesData.items ?? []).map((p) => ({
					value: p.metadata.id ?? "",
					label: displayLabel(p.metadata),
				})),
			],
		},
	];

	const items = data.items ?? [];
	const filtered = activeFilterCount(filters, { ...search }) > 0;

	function patch(next: FilterState) {
		void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true });
	}

	async function handleDelete(binding: PolicyBinding) {
		const ok = await confirm({
			title: `Delete ${displayLabel(binding.metadata)}?`,
			description: "Its subjects fall back to the next matching binding.",
			confirmLabel: "Delete",
			danger: true,
		});
		if (!ok) return;
		try {
			await deleteBinding.mutateAsync(binding.metadata.id ?? "");
			toast(
				"success",
				`Policy binding "${displayLabel(binding.metadata)}" deleted.`,
			);
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError
					? err.body.message
					: "Failed to delete policy binding.",
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
						to="/policy-bindings/new"
						className={buttonVariants({ variant: "default", size: "lg" })}
					>
						<Plus className="w-3.5 h-3.5" />
						New policy binding
					</Link>
				}
			/>

			{items.length === 0 ? (
				<div className="rounded-lg border border-dashed border-input bg-card px-6 py-14 text-center">
					<ShieldCheck className="w-6 h-6 mx-auto mb-3 text-muted-foreground/50" />
					{!filtered ? (
						<>
							<p className="text-sm font-medium text-foreground mb-1">
								No policy bindings yet
							</p>
							<p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
								A policy binding points the callers inside one project at one
								policy. The lowest priority wins.
							</p>
							<Link
								to="/policy-bindings/new"
								className={buttonVariants({ variant: "default", size: "lg" })}
							>
								<Plus className="w-4 h-4" />
								Create policy binding
							</Link>
						</>
					) : (
						<p className="text-sm text-muted-foreground">
							No policy bindings match this filter.
						</p>
					)}
				</div>
			) : (
				<div className="overflow-x-auto rounded-lg border border-border bg-card">
					<table className="w-full border-collapse">
						<thead className="bg-muted/40">
							<tr>
								<Th variant="column">Name</Th>
								<Th variant="column">Project</Th>
								<Th variant="column">Policy</Th>
								<Th variant="column">Priority</Th>
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
								const policy = policyNames.get(binding.spec.policyId);
								return (
									<tr
										key={binding.metadata.name}
										className="border-t border-border transition-colors hover:bg-muted/40"
									>
										<td className="px-3 py-2">
											<Link
												to="/policy-bindings/$name"
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
											<OwnerLink
												owner={{
													kind: "project",
													id: binding.spec.projectId,
												}}
											/>
										</td>
										<td className="px-3 py-2 text-xs">
											{policy ? (
												<Link
													to="/policies/$name"
													params={{ name: policy.name }}
													className="text-foreground hover:underline"
												>
													{policy.label}
												</Link>
											) : (
												<code className="font-mono text-[11px]">
													{binding.spec.policyId.slice(0, 8)}…
												</code>
											)}
										</td>
										<td className="px-3 py-2 text-xs text-muted-foreground">
											{binding.spec.priority ?? "—"}
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
																to="/policy-bindings/$name/edit"
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

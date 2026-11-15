import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Plus, ShieldCheck } from "lucide-react";
import { accountLabel } from "@/accounts/accountView";
import { useAccounts } from "@/api/hooks/accounts";
import { usePolicies } from "@/api/hooks/policies";
import {
	type PolicyBindingsListParams,
	useDeletePolicyBinding,
	usePolicyBindingsList,
} from "@/api/hooks/policyBindings";
import { useProjects } from "@/api/hooks/projects";
import { buttonVariants } from "@/components/ui/button";
import { FilterBar } from "@/filters/FilterBar";
import { toolbarMainActionClassName } from "@/filters/ToolbarActions";
import { activeFilterCount } from "@/filters/toQueryParams";
import type { FilterDef, FilterState } from "@/filters/types";
import { useOwnerFilter } from "@/hooks/useOwnerFilter";
import { displayLabel } from "@/lib/displayLabel";
import {
	type BoundPolicyName,
	PolicyBindingColumns,
	PolicyBindingRow,
} from "@/policy-bindings/PolicyBindingRow";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { LineTable } from "@/shared/LineGrid";
import { OwnerFilter } from "@/shared/OwnerFilter";
import { StaleContent } from "@/shared/StaleContent";
import { TableEmpty } from "@/shared/TableEmpty";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";
import { useDeferredSearch } from "@/shared/useDeferredSearch";

export interface PolicyBindingsSearch {
	q: string;
	/** A project-owned binding's owner id. */
	project_id: string;
	/** Not `policy_id`: the logs route already owns that key as a list. */
	policy: string;
	account: string;
}

/** Static filters; the project, policy and account pickers are appended at
 * render time because their options come from the catalog. */
const STATIC_FILTERS = [
	{
		key: "q",
		type: "search",
		label: "Search",
		placeholder: "Search policy bindings",
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
	if (search.project_id) params.owner_id = [search.project_id];
	if (search.policy) params.policy_id = [search.policy];
	if (search.account) params.account_id = [search.account];
	return params;
}

export function PolicyBindingsTable() {
	const navigate = useNavigate({ from: "/policies" });
	const live = useSearch({ from: "/_authenticated/policies/" });
	const { search, isStale } = useDeferredSearch(live);
	const { data } = usePolicyBindingsList(toPolicyBindingsParams(search));
	const { data: projectsData } = useProjects();
	const { data: policiesData } = usePolicies();
	const { data: accountsData } = useAccounts();
	const del = useConfirmedDelete(useDeletePolicyBinding(), {
		noun: "policy binding",
	});

	const policyNames = new Map<string, BoundPolicyName>(
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
		{
			key: "account",
			type: "select",
			label: "Account",
			default: "",
			options: [
				{ value: "", label: "Any account" },
				...(accountsData.items ?? []).map((a) => ({
					value: a.metadata.id ?? "",
					label: accountLabel(a),
				})),
			],
		},
	];

	const owner = useOwnerFilter(data.items ?? []);
	const items = owner.visible;
	const filtered =
		activeFilterCount(filters, { ...search }) > 0 || owner.selected.length > 0;

	function patch(next: FilterState) {
		void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true });
	}

	return (
		<div>
			<FilterBar
				defs={filters}
				state={{ ...live }}
				onChange={patch}
				extra={<OwnerFilter filter={owner} />}
				extraActive={owner.isDefault ? 0 : 1}
				className="mb-3"
				actions={
					<Link
						to="/policy-bindings/new"
						className={toolbarMainActionClassName}
					>
						<Plus data-icon="inline-start" className="w-3.5 h-3.5" />
						New policy binding
					</Link>
				}
			/>

			<StaleContent stale={isStale}>
				{items.length === 0 ? (
					<TableEmpty icon={ShieldCheck}>
						{!filtered ? (
							<>
								<p className="text-sm font-medium text-foreground mb-1">
									No policy bindings yet
								</p>
								<p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
									A policy binding attaches one policy to accounts: team,
									project, personal, member, service or provider. Each account
									sits in one binding.
								</p>
								<Link
									to="/policy-bindings/new"
									className={buttonVariants({ variant: "default", size: "lg" })}
								>
									<Plus data-icon="inline-start" className="w-4 h-4" />
									Create policy binding
								</Link>
							</>
						) : (
							<p className="text-sm text-muted-foreground">
								No policy bindings match this filter.
							</p>
						)}
					</TableEmpty>
				) : (
					<LineTable minWidth="min-w-[45rem]">
						<PolicyBindingColumns />
						{items.map((binding) => (
							<PolicyBindingRow
								key={binding.metadata.name}
								binding={binding}
								policy={policyNames.get(binding.spec.policyId)}
								onDelete={() =>
									del.request({
										id: binding.metadata.id ?? "",
										name: binding.metadata.name,
										label: displayLabel(binding.metadata),
									})
								}
							/>
						))}
					</LineTable>
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

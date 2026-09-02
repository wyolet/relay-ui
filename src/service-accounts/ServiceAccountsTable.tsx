import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Bot, Plus } from "lucide-react";
import { usePolicies } from "@/api/hooks/policies";
import { useProjects } from "@/api/hooks/projects";
import {
	type ServiceAccountsListParams,
	useDeleteServiceAccount,
	useServiceAccountsList,
} from "@/api/hooks/serviceAccounts";
import { ApiError } from "@/api/types/errors";
import type { ServiceAccount } from "@/api/types/serviceAccount";
import { buttonVariants } from "@/components/ui/button";
import { FilterBar } from "@/filters/FilterBar";
import { activeFilterCount } from "@/filters/toQueryParams";
import type { FilterDef, FilterState } from "@/filters/types";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { useToggleServiceAccountEnabled } from "@/service-accounts/useToggleServiceAccountEnabled";
import { confirm } from "@/shared/ConfirmDialog";
import { RowMenu } from "@/shared/RowMenu";
import { Switch } from "@/shared/Switch";
import { TableToolbar } from "@/shared/TableToolbar";
import { Th } from "@/shared/Th";
import { toast } from "@/shared/Toast";

/** Filters rendered above the table, all served by GET /service-accounts. */
export const SERVICE_ACCOUNT_FILTERS = [
	{
		key: "q",
		type: "search",
		label: "Search",
		placeholder: "Search service accounts",
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

/** Map the route's filter state onto GET /service-accounts query params. */
export function toServiceAccountsParams(search: {
	q: string;
	enabled: "all" | "true" | "false";
	project_id: string;
}): ServiceAccountsListParams {
	const params: ServiceAccountsListParams = {};
	const q = search.q.trim();
	if (q) params.q = q;
	if (search.enabled !== "all") params.enabled = search.enabled === "true";
	if (search.project_id) params.project_id = [search.project_id];
	return params;
}

export function ServiceAccountsTable() {
	const navigate = useNavigate({ from: "/service-accounts" });
	const search = useSearch({ from: "/_authenticated/service-accounts/" });
	const { data } = useServiceAccountsList(toServiceAccountsParams(search));
	const { data: projectsData } = useProjects();
	const { data: policiesData } = usePolicies();
	const deleteServiceAccount = useDeleteServiceAccount();
	const { setEnabled } = useToggleServiceAccountEnabled();

	const projectLabels = new Map<string, string>();
	for (const p of projectsData.items ?? []) {
		if (p.metadata.id)
			projectLabels.set(p.metadata.id, displayLabel(p.metadata));
	}
	const policyLabels = new Map<string, string>();
	for (const p of policiesData.items ?? []) {
		if (p.metadata.id)
			policyLabels.set(p.metadata.id, displayLabel(p.metadata));
	}

	const items = data.items ?? [];
	const filtered =
		activeFilterCount(SERVICE_ACCOUNT_FILTERS, { ...search }) > 0;

	function patch(next: FilterState) {
		void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true });
	}

	async function handleDelete(sa: ServiceAccount) {
		const ok = await confirm({
			title: `Delete ${displayLabel(sa.metadata)}?`,
			description: "Keys issued to this account stop authenticating.",
			confirmLabel: "Delete",
			danger: true,
		});
		if (!ok) return;
		try {
			await deleteServiceAccount.mutateAsync(sa.metadata.id ?? "");
			toast(
				"success",
				`Service account "${displayLabel(sa.metadata)}" deleted.`,
			);
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError
					? err.body.message
					: "Failed to delete service account.",
			);
		}
	}

	return (
		<div>
			<TableToolbar
				search={
					<FilterBar
						defs={SERVICE_ACCOUNT_FILTERS}
						state={{ q: search.q, enabled: search.enabled }}
						onChange={patch}
					/>
				}
				actions={
					<Link
						to="/service-accounts/new"
						className={buttonVariants({ variant: "default", size: "lg" })}
					>
						<Plus className="w-3.5 h-3.5" />
						New service account
					</Link>
				}
			/>

			{items.length === 0 ? (
				<div className="rounded-lg border border-dashed border-input bg-card px-6 py-14 text-center">
					<Bot className="w-6 h-6 mx-auto mb-3 text-muted-foreground/50" />
					{!filtered ? (
						<>
							<p className="text-sm font-medium text-foreground mb-1">
								No service accounts yet
							</p>
							<p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
								A service account is the non-human principal a key authenticates
								as. It lives in a project.
							</p>
							<Link
								to="/service-accounts/new"
								className={buttonVariants({ variant: "default", size: "lg" })}
							>
								<Plus className="w-4 h-4" />
								Create service account
							</Link>
						</>
					) : (
						<p className="text-sm text-muted-foreground">
							No service accounts match this filter.
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
							{items.map((sa) => {
								const enabled = sa.spec.enabled ?? true;
								const policyId = sa.spec.policyId ?? "";
								return (
									<tr
										key={sa.metadata.name}
										className={[
											"border-t border-border transition-colors",
											enabled
												? "hover:bg-muted/40"
												: "bg-muted/30 text-muted-foreground/70",
										].join(" ")}
									>
										<td className="px-3 py-2">
											<Link
												to="/service-accounts/$name"
												params={{ name: sa.metadata.name }}
												className="text-sm font-medium text-foreground hover:underline"
											>
												{displayLabel(sa.metadata)}
											</Link>
											{hasDisplayName(sa.metadata) && (
												<div className="font-mono text-[11px] text-muted-foreground">
													{sa.metadata.name}
												</div>
											)}
										</td>
										<td className="px-3 py-2 text-xs text-foreground">
											{projectLabels.get(sa.spec.projectId) ??
												`Unknown (${sa.spec.projectId.slice(0, 6)}…)`}
										</td>
										<td className="px-3 py-2 text-xs text-foreground">
											{policyId
												? (policyLabels.get(policyId) ?? policyId)
												: "—"}
										</td>
										<td className="px-3 py-2">
											<Switch
												checked={enabled}
												onChange={(next) => void setEnabled(sa, next)}
												label={`Toggle ${sa.metadata.name}`}
											/>
										</td>
										<td className="px-3 py-2 text-right">
											<RowMenu
												actions={[
													{
														label: "Edit",
														render: (
															<Link
																to="/service-accounts/$name/edit"
																params={{ name: sa.metadata.name }}
															/>
														),
													},
													{
														label: "Delete",
														danger: true,
														onClick: () => void handleDelete(sa),
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

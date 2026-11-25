import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Bot, Plus } from "lucide-react";
import {
	type ServiceAccountsListParams,
	useDeleteServiceAccount,
	useServiceAccountsList,
} from "@/api/hooks/serviceAccounts";
import { buttonVariants } from "@/components/ui/button";
import { FilterBar } from "@/filters/FilterBar";
import {
	toolbarActionClassName,
	toolbarMainActionClassName,
} from "@/filters/ToolbarActions";
import { activeFilterCount } from "@/filters/toQueryParams";
import type { FilterDef, FilterState } from "@/filters/types";
import { useOwnerFilter } from "@/hooks/useOwnerFilter";
import { displayLabel } from "@/lib/displayLabel";
import {
	SERVICE_ACCOUNT_MIN_W,
	ServiceAccountColumns,
	ServiceAccountRow,
} from "@/service-accounts/ServiceAccountRow";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { LineTable } from "@/shared/LineGrid";
import { OwnerFilter } from "@/shared/OwnerFilter";
import { StaleContent } from "@/shared/StaleContent";
import { TableEmpty } from "@/shared/TableEmpty";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";
import { useDeferredSearch } from "@/shared/useDeferredSearch";

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
	const live = useSearch({ from: "/_authenticated/service-accounts/" });
	const { search, isStale } = useDeferredSearch(live);
	const { data } = useServiceAccountsList(toServiceAccountsParams(search));
	const del = useConfirmedDelete(useDeleteServiceAccount(), {
		noun: "service account",
	});

	const owner = useOwnerFilter(data.items ?? []);
	const items = owner.visible;
	const filtered =
		activeFilterCount(SERVICE_ACCOUNT_FILTERS, { ...search }) > 0 ||
		owner.selected.length > 0;

	function patch(next: FilterState) {
		void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true });
	}

	return (
		<div>
			<FilterBar
				defs={SERVICE_ACCOUNT_FILTERS}
				state={{ q: live.q, enabled: live.enabled }}
				onChange={patch}
				extra={<OwnerFilter filter={owner} />}
				extraActive={owner.isDefault ? 0 : 1}
				className="mb-3"
				actions={
					<>
						<Link
							to="/service-accounts/add-agent"
							className={toolbarMainActionClassName}
						>
							<Bot data-icon="inline-start" className="w-3.5 h-3.5" />
							Add agent
						</Link>
						<Link to="/service-accounts/new" className={toolbarActionClassName}>
							<Plus data-icon="inline-start" className="w-3.5 h-3.5" />
							New service account
						</Link>
					</>
				}
			/>

			<StaleContent stale={isStale}>
				{items.length === 0 ? (
					<TableEmpty icon={Bot}>
						{!filtered ? (
							<>
								<p className="text-sm font-medium text-foreground mb-1">
									No service accounts yet
								</p>
								<p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
									A service account is the non-human principal a key
									authenticates as. It belongs to a project, a team or a user.
								</p>
								<Link
									to="/service-accounts/new"
									className={buttonVariants({ variant: "default", size: "lg" })}
								>
									<Plus data-icon="inline-start" className="w-4 h-4" />
									Create service account
								</Link>
							</>
						) : (
							<p className="text-sm text-muted-foreground">
								No service accounts match this filter.
							</p>
						)}
					</TableEmpty>
				) : (
					<LineTable minWidth={SERVICE_ACCOUNT_MIN_W}>
						<ServiceAccountColumns />
						{items.map((sa) => (
							<ServiceAccountRow
								key={sa.metadata.id ?? sa.metadata.name}
								sa={sa}
								onDelete={() =>
									del.request({
										id: sa.metadata.id ?? "",
										name: sa.metadata.name,
										label: displayLabel(sa.metadata),
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

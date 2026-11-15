import { useNavigate, useSearch } from "@tanstack/react-router";
import { type KeysListParams, useKeysList } from "@/api/hooks/keys";
import { useServiceAccounts } from "@/api/hooks/serviceAccounts";
import type { SortControl } from "@/filters/FilterBar";
import { activeFilterCount } from "@/filters/toQueryParams";
import type { FilterDef, FilterState } from "@/filters/types";
import { displayLabel } from "@/lib/displayLabel";
import {
	KEYS_SORT_DIR,
	type KeysSortKey,
	principalName,
	sortKeyLines,
} from "@/lib/keyLines";
import { useWeekUsageBy } from "@/pricing/useHostModelUsage";
import { useDeferredSearch } from "@/shared/useDeferredSearch";

/** Filters rendered above the table, all served by GET /keys. */
export const KEY_FILTERS = [
	{
		key: "q",
		type: "search",
		label: "Search",
		placeholder: "Search keys",
		default: "",
	},
	{
		key: "principal_kind",
		type: "select",
		label: "Principal",
		default: "all",
		options: [
			{ value: "all", label: "Any principal" },
			{ value: "serviceaccount", label: "Service accounts" },
			{ value: "user", label: "Users" },
		],
	},
	{
		key: "expired",
		type: "select",
		label: "Expiry",
		default: "all",
		options: [
			{ value: "all", label: "Any expiry" },
			{ value: "false", label: "Not expired" },
			{ value: "true", label: "Expired" },
		],
	},
] as const satisfies readonly FilterDef[];

const KEY_SORTS = [
	{ value: "usage", label: "Your usage" },
	{ value: "used", label: "Last used" },
	{ value: "newest", label: "Newest" },
	{ value: "name", label: "Name" },
	{ value: "expires", label: "Expiring soonest" },
] as const;

/** Map the route's filter state onto GET /keys query params. */
export function toKeysParams(search: {
	q: string;
	principal_kind: "all" | "serviceaccount" | "user";
	principal_id: string;
	expired: "all" | "true" | "false";
}): KeysListParams {
	const params: KeysListParams = {};
	const q = search.q.trim();
	if (q) params.q = q;
	if (search.principal_kind !== "all")
		params.principal_kind = [search.principal_kind];
	if (search.principal_id) params.principal_id = [search.principal_id];
	if (search.expired !== "all") params.expired = search.expired === "true";
	return params;
}

/** The API keys tab: the server-filtered list in the chosen order, each key
 * with its principal's name and last week's traffic, plus the toolbar state. */
export function useKeysTable() {
	const navigate = useNavigate({ from: "/keys" });
	const live = useSearch({ from: "/_authenticated/keys" });
	const { search, isStale } = useDeferredSearch(live);
	const { data: keysData } = useKeysList(toKeysParams(search));
	const { data: accountsData } = useServiceAccounts();
	const usage = useWeekUsageBy("relay_key_hash");

	const accountLabels = new Map<string, string>();
	for (const sa of accountsData.items ?? []) {
		if (sa.metadata.id)
			accountLabels.set(sa.metadata.id, displayLabel(sa.metadata));
	}

	const lines = sortKeyLines(
		(keysData.items ?? []).map((key) => ({
			key,
			usage: usage?.get(key.spec.keyHash),
		})),
		{ key: live.keys_by, dir: live.dir },
	).map((line) => ({
		...line,
		principal: principalName(line.key.spec.principal, accountLabels),
	}));

	function patch(next: FilterState) {
		void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true });
	}

	const sort: SortControl<KeysSortKey> = {
		options: KEY_SORTS,
		value: live.keys_by,
		dir: live.dir,
		// Picking another sort starts it in the direction it reads best in.
		onChange: (keys_by, dir) =>
			void navigate({
				search: (prev) => ({
					...prev,
					keys_by,
					dir: keys_by === live.keys_by ? dir : KEYS_SORT_DIR[keys_by],
				}),
				replace: true,
			}),
	};

	return {
		filterState: {
			q: live.q,
			principal_kind: live.principal_kind,
			expired: live.expired,
		},
		lines,
		filtered: activeFilterCount(KEY_FILTERS, { ...search }) > 0,
		isStale,
		patch,
		sort,
	};
}

export type KeyTableLine = ReturnType<typeof useKeysTable>["lines"][number];

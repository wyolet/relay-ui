import { useState } from "react";
import { useAuth } from "@/api/auth";
import type { components } from "@/api/types.gen";
import { useWorkContext } from "@/hooks/useWorkContext";
import {
	matchesOwnerFilter,
	ownerFilterKey,
	ownerFilterOptions,
	ownerFilterSummary,
} from "@/lib/ownerFilter";
import { contextKey } from "@/lib/workContext";

type Owner = components["schemas"]["Owner"];

/**
 * A list's owner filter: the workspace's context by default, any mix of
 * contexts once picked. A pick lasts until the workspace switches.
 */
export function useOwnerFilter<T extends { metadata: { owner?: Owner } }>(
	rows: readonly T[],
) {
	const { userId } = useAuth();
	const { contexts, current } = useWorkContext();
	const currentKey = current ? contextKey(current) : undefined;
	const [picked, setPicked] = useState<{
		under: string | undefined;
		keys: string[];
	} | null>(null);
	const selected =
		picked && picked.under === currentKey
			? picked.keys
			: currentKey
				? [currentKey]
				: [];

	const keyOf = (row: T) => ownerFilterKey(row.metadata.owner, userId);
	const options = ownerFilterOptions(contexts, new Set(rows.map(keyOf)));
	const listedKeys = new Set(contexts.map(contextKey));
	const matches = (row: T) =>
		matchesOwnerFilter(keyOf(row), selected, listedKeys);

	return {
		options,
		selected,
		summary: ownerFilterSummary(selected, options),
		setSelected: (keys: string[]) => setPicked({ under: currentKey, keys }),
		matches,
		visible: rows.filter(matches),
	};
}

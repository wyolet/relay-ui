import type { Model } from "@/api/types/model";
import { sortByLowestPrice } from "@/lib/pricingMatrix";
import type { ModelsSortDir, ModelsSortKey } from "@/models/ModelsTable";
import { useModelPrices } from "@/pricing/useModelPrices";

/** The models table's rows with their prices. Sorted by price, `items` is the
 * full filtered set: it's ordered and windowed to `page` here. */
export function useModelsPricePage(
	items: readonly Model[],
	sort: ModelsSortKey,
	dir: ModelsSortDir,
	page: number,
	pageSize: number,
) {
	const prices = useModelPrices();
	if (sort !== "price") return { items, prices };
	const sorted = sortByLowestPrice(
		items,
		(m) => prices?.get(m.metadata.id ?? ""),
		dir,
	);
	return {
		items: sorted.slice((page - 1) * pageSize, page * pageSize),
		prices,
	};
}

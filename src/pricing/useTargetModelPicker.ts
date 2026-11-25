import { useState } from "react";
import {
	type TargetModelOption,
	useTargetModelGroups,
} from "./useTargetModelOptions";

function matches(o: TargetModelOption, needle: string): boolean {
	return (
		o.label.toLowerCase().includes(needle) ||
		o.slug.toLowerCase().includes(needle)
	);
}

/** The target-model picker's search and its two lists: the owning host's
 * models, then every other registered model. */
export function useTargetModelPicker(hostId: string) {
	const { served, others } = useTargetModelGroups(hostId);
	const [q, setQ] = useState("");
	const needle = q.trim().toLowerCase();
	const keep = (list: TargetModelOption[]) =>
		needle ? list.filter((o) => matches(o, needle)) : list;
	const byId = new Map([...served, ...others].map((o) => [o.id, o]));
	return {
		q,
		setQ,
		served: keep(served),
		others: keep(others),
		/** No models are registered at all. */
		empty: byId.size === 0,
		labelOf: (id: string) => byId.get(id)?.label ?? id,
	};
}

import { useSuspenseQuery } from "@tanstack/react-query";
import { modelsListQueryOptions } from "@/api/hooks/models";
import { displayLabel } from "@/lib/displayLabel";

export interface TargetModelOption {
	/** Model UUID — the value stored in PricingSpec.targetModels. */
	id: string;
	label: string;
	slug: string;
}

/** Registered models as target-model picker options, alphabetical. */
export function useTargetModelOptions(): TargetModelOption[] {
	const { data } = useSuspenseQuery(modelsListQueryOptions);
	return (data.items ?? [])
		.flatMap((m) => {
			const id = m.metadata.id;
			if (!id) return [];
			return [{ id, label: displayLabel(m.metadata), slug: m.metadata.name }];
		})
		.sort((a, b) => a.label.localeCompare(b.label));
}

/** Resolve stored targetModels values to display labels (id → slug → raw). */
export function useTargetModelLabeler(): (value: string) => string {
	const options = useTargetModelOptions();
	const byId = new Map(options.map((o) => [o.id, o.label]));
	const bySlug = new Map(options.map((o) => [o.slug, o.label]));
	return (value) => byId.get(value) ?? bySlug.get(value) ?? value;
}

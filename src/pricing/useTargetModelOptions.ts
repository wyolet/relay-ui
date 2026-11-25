import { useSuspenseQuery } from "@tanstack/react-query";
import { bindingsByHost, useBindings } from "@/api/hooks/bindings";
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

export interface TargetModelGroups {
	/** Models the owning host binds; empty until a host is picked. */
	served: TargetModelOption[];
	others: TargetModelOption[];
}

/** The picker's options split by whether the owning host serves them. */
export function useTargetModelGroups(hostId: string): TargetModelGroups {
	const options = useTargetModelOptions();
	const { data } = useBindings();
	const servedIds = new Set(
		(bindingsByHost(data.items ?? []).get(hostId) ?? []).map(
			(b) => b.spec.modelId,
		),
	);
	return {
		served: options.filter((o) => servedIds.has(o.id)),
		others: options.filter((o) => !servedIds.has(o.id)),
	};
}

/** Resolve stored targetModels values to display labels (id → slug → raw). */
export function useTargetModelLabeler(): (value: string) => string {
	const options = useTargetModelOptions();
	const byId = new Map(options.map((o) => [o.id, o.label]));
	const bySlug = new Map(options.map((o) => [o.slug, o.label]));
	return (value) => byId.get(value) ?? bySlug.get(value) ?? value;
}

import { useSuspenseQuery } from "@tanstack/react-query";
import { hostsListQueryOptions } from "@/api/hooks/hosts";
import { displayLabel } from "@/lib/displayLabel";

export interface HostOption {
	/** Host UUID — what Pricing.metadata.owner.id stores. */
	id: string;
	label: string;
	slug: string;
}

/** Registered hosts as owner-picker options, alphabetical. */
export function useHostOptions(): HostOption[] {
	const { data } = useSuspenseQuery(hostsListQueryOptions);
	return (data.items ?? [])
		.flatMap((h) => {
			const id = h.metadata.id;
			if (!id) return [];
			return [{ id, label: displayLabel(h.metadata), slug: h.metadata.name }];
		})
		.sort((a, b) => a.label.localeCompare(b.label));
}

/** Resolve a host UUID to its option (label + slug for links); undefined when unknown. */
export function useHostOptionById(): (id: string) => HostOption | undefined {
	const options = useHostOptions();
	const byId = new Map(options.map((o) => [o.id, o]));
	return (id) => byId.get(id);
}

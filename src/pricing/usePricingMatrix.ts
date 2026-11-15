import {
	type CatalogGraphResponse,
	catalogGraphQueryOptions,
} from "@/api/hooks/catalog";
import { pricingsListQuery } from "@/api/hooks/pricings";
import type { HostListResponse } from "@/api/types/host";
import type { ModelListResponse } from "@/api/types/model";
import type { PricingListResponse } from "@/api/types/pricing";
import type { components } from "@/api/types.gen";
import { displayLabel } from "@/lib/displayLabel";
import { buildPricingMatrix, type HostPrices } from "@/lib/pricingMatrix";

type Metadata = components["schemas"]["Metadata"];

/** Generous page size; warn (never silently truncate) past it. */
const PRICINGS_LIMIT = 500;

export const pricingGraphQuery = catalogGraphQueryOptions({
	includeDeprecated: true,
});
export const pricingsMatrixListQuery = pricingsListQuery({
	limit: PRICINGS_LIMIT,
});

/** The pricing matrix from the catalog graph (bindings) and the host, model
 * and pricing lists; every price shown in the UI resolves through it. */
export function matrixFromLists(lists: {
	graph: CatalogGraphResponse;
	/** Which host serves which model. Default: the graph's bindings, which
	 * leave out disabled models; pass the full binding list to keep them. */
	bindings?: readonly { hostId: string; modelId: string }[];
	hosts: HostListResponse;
	models: ModelListResponse;
	pricings: PricingListResponse;
}): HostPrices[] {
	const ref = (meta: Metadata) =>
		meta.id
			? [{ id: meta.id, slug: meta.name, label: displayLabel(meta) }]
			: [];
	return buildPricingMatrix({
		hosts: (lists.hosts.items ?? []).flatMap((h) =>
			ref(h.metadata).map((r) => ({ ...r, icon: h.spec.icon })),
		),
		models: (lists.models.items ?? []).flatMap((m) =>
			ref(m.metadata).map((r) => ({
				...r,
				releaseDate: m.spec.releaseDate,
				deprecated:
					(m.spec.deprecation?.status ?? "active") !== "active" ||
					Boolean(m.spec.deprecationDate),
			})),
		),
		bindings:
			lists.bindings ??
			(lists.graph.models ?? []).flatMap((m) =>
				(m.bindings ?? []).map((b) => ({ hostId: b.hostId, modelId: m.id })),
			),
		pricings: (lists.pricings.items ?? []).flatMap((p) =>
			p.metadata.owner?.id
				? [
						{
							name: p.metadata.name,
							label: displayLabel(p.metadata),
							hostId: p.metadata.owner.id,
							enabled: p.spec.enabled !== false,
							currency: p.spec.currency,
							targetModels: p.spec.targetModels ?? [],
							rates: p.spec.rates ?? [],
						},
					]
				: [],
		),
	});
}

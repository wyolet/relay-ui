import { useSuspenseQuery } from "@tanstack/react-query";
import type { Pricing } from "@/api/types/pricing";
import {
	blendedRequestCost,
	EXAMPLE_COMPLETION_TOKENS,
	EXAMPLE_PROMPT_TOKENS,
} from "@/lib/usage-math/pricing";
import type { FigureData } from "@/shared/FigureRow";
import { fmtCompact, fmtMoneyCompact } from "@/usage/format";
import { fmtCost } from "./MeterGrid";
import { useHostModelUsage } from "./useHostModelUsage";
import { useHostOptionById } from "./useHostOptions";
import { pricingGraphQuery } from "./usePricingMatrix";
import { useTargetModelOptions } from "./useTargetModelOptions";

export interface PricingTarget {
	id: string;
	label: string;
	slug: string;
	/** False when the sheet's host has no binding for the model: the target
	 * prices nothing. */
	served: boolean;
	requests: string;
	spend: string;
}

/** A rate sheet's host, its target models with last week's traffic on that
 * host, and the figures that say what the sheet priced. Usage loads without
 * suspending; until it does the figures read "—". */
export function usePricingDetail(pricing: Pricing) {
	const { data: graph } = useSuspenseQuery(pricingGraphQuery);
	const options = useTargetModelOptions();
	const hostOf = useHostOptionById();
	const hostId = pricing.metadata.owner?.id ?? "";
	const usage = useHostModelUsage(hostId ? [hostId] : []).get(hostId);
	const currency = pricing.spec.currency || "USD";

	const served = new Set(
		(graph.models ?? [])
			.filter((m) => m.bindings?.some((b) => b.hostId === hostId))
			.map((m) => m.id),
	);
	const byId = new Map(options.map((o) => [o.id, o]));
	const rows = (pricing.spec.targetModels ?? []).map((id) => ({
		id,
		option: byId.get(id),
		usage: usage?.get(id),
	}));
	const requests = rows.reduce((n, r) => n + (r.usage?.requests ?? 0), 0);
	const priced = rows.flatMap((r) =>
		r.usage?.usd != null ? [r.usage.usd] : [],
	);
	const spent = priced.length > 0 ? priced.reduce((a, b) => a + b, 0) : null;

	const targets: PricingTarget[] = rows
		.sort(
			(a, b) =>
				(b.usage?.requests ?? 0) - (a.usage?.requests ?? 0) ||
				(a.option?.label ?? a.id).localeCompare(b.option?.label ?? b.id),
		)
		.map((r) => ({
			id: r.id,
			label: r.option?.label ?? r.id,
			slug: r.option?.slug ?? r.id,
			served: served.has(r.id),
			requests: r.usage ? fmtCompact(r.usage.requests) : "—",
			spend: r.usage?.usd != null ? fmtMoneyCompact(r.usage.usd, "USD") : "—",
		}));

	const typical = blendedRequestCost(pricing.spec.rates ?? []);
	const figures: FigureData[] = [
		{
			key: "spend",
			label: "Est. spend",
			value: spent != null ? fmtMoneyCompact(spent, "USD") : "—",
			note: usage ? "last 7 days" : undefined,
		},
		{
			key: "requests",
			label: "Requests",
			value: usage ? fmtCompact(requests) : "—",
			note: usage ? "last 7 days" : undefined,
		},
		{
			key: "per-request",
			label: "Cost per request",
			value:
				spent != null && requests > 0 ? fmtCost(spent / requests, "USD") : "—",
			note: "measured",
		},
		{
			key: "typical",
			label: "Typical request",
			value: typical != null ? `≈ ${fmtCost(typical, currency)}` : "—",
			note: `${fmtCompact(EXAMPLE_PROMPT_TOKENS)} in, ${fmtCompact(EXAMPLE_COMPLETION_TOKENS)} out`,
		},
	];

	return { host: hostOf(hostId), targets, figures };
}

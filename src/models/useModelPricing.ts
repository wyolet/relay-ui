import type { ModelHostView } from "@/api/hooks/models";
import type { Host } from "@/api/types/host";
import { blendedRequestCost } from "@/lib/usage-math/pricing";
import { isoWindowLabel } from "@/lib/usage-math/window";
import {
	type BindingUsage,
	useModelHostSpend,
} from "@/models/useModelHostSpend";

type Rate = NonNullable<ModelHostView["pricing"]["rates"]>[number];

/** One host binding's pricing card: its rates and the cost figures they give. */
export interface HostPricing {
	row: ModelHostView;
	host: Host | undefined;
	rates: Rate[];
	currency: string;
	pricingName: string | undefined;
	/** Cost of the example request; null without rates to price it. */
	exampleCost: number | null;
	/** Server-stamped spend over the window; null when none of the pair's
	 * events were priced (must show as absent, never $0). */
	estSpend: number | null;
	usage: BindingUsage | undefined;
	isCheapest: boolean;
}

export interface ModelPricing {
	hosts: HostPricing[];
	/** The spend window as "30d" / "12h". */
	windowText: string;
}

/** Each host binding's pricing with its spend over the usage window. */
export function useModelPricing(
	modelId: string,
	hostRows: ModelHostView[],
	hostById: Map<string, Host>,
): ModelPricing {
	const spend = useModelHostSpend(modelId);

	// Cheapest host by example-request cost — only meaningful with ≥2 priced hosts.
	const costByHost = new Map<string, number>();
	for (const row of hostRows) {
		const c = blendedRequestCost(bindingPricing(row)?.rates ?? []);
		if (c != null && c > 0) costByHost.set(row.host.id, c);
	}
	const cheapest =
		costByHost.size >= 2 ? Math.min(...costByHost.values()) : null;

	const hosts = hostRows.map((row): HostPricing => {
		const pricing = bindingPricing(row);
		const rates = pricing?.rates ?? [];
		const usage = spend.byHost.get(row.host.id);
		return {
			row,
			host: hostById.get(row.host.id),
			rates,
			currency: pricing?.currency || "USD",
			pricingName: pricing?.name,
			exampleCost: rates.length > 0 ? blendedRequestCost(rates) : null,
			estSpend: usage?.cost.usd ?? null,
			usage,
			isCheapest: cheapest != null && costByHost.get(row.host.id) === cheapest,
		};
	});

	return { hosts, windowText: isoWindowLabel(spend.from, spend.to) };
}

/**
 * The schema marks ModelHostRow.pricing as required, but the relay serializes
 * null for bindings without a pricing record — re-type it nullable here so
 * every read is guarded. Drop once the BE marks the field optional.
 */
function bindingPricing(row: ModelHostView): ModelHostView["pricing"] | null {
	return row.pricing;
}

import {
	groupByMeter,
	prettyMeter,
	type RateLike,
} from "@/lib/usage-math/pricing";

/** The meters every rate table shows as columns; others count as `extra`. */
const COLUMN_METERS = [
	"tokens.input",
	"tokens.output",
	"tokens.cache_read",
	"tokens.cache_creation",
] as const;

export type RateColumn = (typeof COLUMN_METERS)[number];

export const RATE_COLUMNS = COLUMN_METERS.map((meter) => ({
	meter,
	label: prettyMeter(meter),
}));

/** A meter's base (lowest-tier) rate; `tiered` when higher tiers follow. */
export interface RateCell {
	amount: number;
	unit: string;
	tiered: boolean;
}

export interface MatrixHost {
	id: string;
	slug: string;
	label: string;
}

export interface MatrixModel {
	id: string;
	slug: string;
	label: string;
}

export interface MatrixPricing {
	name: string;
	label: string;
	hostId: string;
	enabled: boolean;
	currency: string;
	targetModels: readonly string[];
	rates: readonly RateLike[];
}

export interface PriceRow {
	model: MatrixModel;
	/** The sheet pricing this model on this host; an enabled one wins. */
	sheet?: { name: string; label: string; enabled: boolean };
	currency: string;
	cells: Partial<Record<RateColumn, RateCell>>;
	/** Priced meters outside {@link RATE_COLUMNS}. */
	extra: number;
	/** False when a sheet targets a model the host has no binding for. */
	served: boolean;
	/** Served, and no enabled sheet prices it: its usage counts as unpriced. */
	unpriced: boolean;
}

export interface HostPrices {
	host: MatrixHost;
	rows: PriceRow[];
	unpriced: number;
}

function rateCells(rates: readonly RateLike[]) {
	const cells: Partial<Record<RateColumn, RateCell>> = {};
	let extra = 0;
	for (const g of groupByMeter(rates)) {
		const base = g.rates[0];
		if (!base) continue;
		const column = RATE_COLUMNS.find((c) => c.meter === g.meter);
		if (!column) {
			extra++;
			continue;
		}
		cells[column.meter] = {
			amount: base.amount,
			unit: g.unit,
			tiered: g.rates.length > 1,
		};
	}
	return { cells, extra };
}

/**
 * Every host's models with the rates relay prices them at. A row per binding
 * (host serves model), plus a row per sheet target the host doesn't serve, so
 * a stale sheet stays visible. Hosts with neither are left out.
 */
export function buildPricingMatrix(input: {
	hosts: readonly MatrixHost[];
	models: readonly MatrixModel[];
	bindings: readonly { hostId: string; modelId: string }[];
	pricings: readonly MatrixPricing[];
}): HostPrices[] {
	const modelById = new Map(input.models.map((m) => [m.id, m]));
	const served = new Map<string, Set<string>>();
	for (const b of input.bindings) {
		const set = served.get(b.hostId) ?? new Set<string>();
		set.add(b.modelId);
		served.set(b.hostId, set);
	}

	const out: HostPrices[] = [];
	for (const host of input.hosts) {
		const sheets = input.pricings.filter((p) => p.hostId === host.id);
		const modelIds = new Set(served.get(host.id));
		for (const s of sheets) for (const id of s.targetModels) modelIds.add(id);

		const rows: PriceRow[] = [];
		for (const id of modelIds) {
			const model = modelById.get(id) ?? { id, slug: id, label: id };
			const matching = sheets.filter((s) => s.targetModels.includes(id));
			const sheet = matching.find((s) => s.enabled) ?? matching[0];
			const isServed = served.get(host.id)?.has(id) ?? false;
			const { cells, extra } = sheet?.enabled
				? rateCells(sheet.rates)
				: { cells: {}, extra: 0 };
			rows.push({
				model,
				sheet: sheet && {
					name: sheet.name,
					label: sheet.label,
					enabled: sheet.enabled,
				},
				currency: sheet?.currency || "USD",
				cells,
				extra,
				served: isServed,
				unpriced: isServed && !sheet?.enabled,
			});
		}
		if (rows.length === 0) continue;
		rows.sort((a, b) => a.model.label.localeCompare(b.model.label));
		out.push({
			host,
			rows,
			unpriced: rows.filter((r) => r.unpriced).length,
		});
	}
	return out.sort((a, b) => a.host.label.localeCompare(b.host.label));
}

/** The matrix narrowed to rows whose model, host or sheet matches `query`,
 * and to unpriced rows when asked. Hosts left without rows drop out. */
export function filterPricingMatrix(
	matrix: readonly HostPrices[],
	query: string,
	unpricedOnly: boolean,
): HostPrices[] {
	const q = query.trim().toLowerCase();
	const hit = (...texts: (string | undefined)[]) =>
		texts.some((t) => t?.toLowerCase().includes(q));
	return matrix.flatMap((h) => {
		const hostHit = q !== "" && hit(h.host.label, h.host.slug);
		const rows = h.rows.filter(
			(r) =>
				(!unpricedOnly || r.unpriced) &&
				(q === "" ||
					hostHit ||
					hit(r.model.label, r.model.slug, r.sheet?.label, r.sheet?.name)),
		);
		return rows.length > 0 ? [{ ...h, rows }] : [];
	});
}

/** Served bindings, and how many an enabled sheet prices. */
export function pricingCoverage(matrix: readonly HostPrices[]) {
	let served = 0;
	let priced = 0;
	for (const h of matrix) {
		for (const r of h.rows) {
			if (!r.served) continue;
			served++;
			if (!r.unpriced) priced++;
		}
	}
	return { served, priced };
}

/** A model's traffic on one host over a window. `usd` is null when none of
 * it was priced. */
export interface ModelUsage {
	requests: number;
	usd: number | null;
}

/** Per-model usage from summary rows grouped by `model_id`. */
export function usageByModel(
	rows: readonly {
		group: Record<string, string>;
		requests: number;
		cost_nanos: number;
		unpriced: number;
	}[],
): Map<string, ModelUsage> {
	const out = new Map<string, ModelUsage>();
	for (const r of rows) {
		const id = r.group.model_id;
		if (!id) continue;
		const priced = r.requests - r.unpriced;
		out.set(id, {
			requests: r.requests,
			usd: priced > 0 ? r.cost_nanos / 1e9 : null,
		});
	}
	return out;
}

/** Rows in the order worth reading: unpriced first (they need a sheet), then
 * the busiest, then by name. */
export function rankPriceRows(
	rows: readonly PriceRow[],
	usage: ReadonlyMap<string, ModelUsage> | undefined,
): PriceRow[] {
	const requests = (r: PriceRow) => usage?.get(r.model.id)?.requests ?? 0;
	return [...rows].sort(
		(a, b) =>
			Number(b.unpriced) - Number(a.unpriced) ||
			requests(b) - requests(a) ||
			a.model.label.localeCompare(b.model.label),
	);
}

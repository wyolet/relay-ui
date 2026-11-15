/**
 * The models catalog read by host: a rail of hosts, and one host's models (or
 * every model with traffic) in groups. Pure; `useModelsByHost` feeds it the
 * pricing matrix, the model specs and usage.
 */

import type { Model } from "@/api/types/model";
import { displayLabel } from "@/lib/displayLabel";
import { hostCards } from "./priceCatalog";
import type {
	HostPrices,
	MatrixHost,
	ModelUsage,
	PriceRow,
} from "./pricingMatrix";
import { compareBlendedPrices } from "./usage-math/blendedPrice";

/** The rail entry and URL value for models with recent traffic. */
export const IN_USE = "in-use";

export const CAPABILITY_FILTERS = [
	"any",
	"tools",
	"vision",
	"reasoning",
] as const;
export type CapabilityFilter = (typeof CAPABILITY_FILTERS)[number];

export type ModelsSortKey = "spend" | "newest" | "price" | "name";
export interface ModelsSort {
	key: ModelsSortKey;
	dir: "asc" | "desc";
}

export interface ModelsFilter {
	q: string;
	cap: CapabilityFilter;
	showDeprecated: boolean;
}

/** Same rule as the pricing matrix: flagged deprecated or sunset, or dated. */
export function isDeprecatedModel(m: Model): boolean {
	return (
		(m.spec.deprecation?.status ?? "active") !== "active" ||
		Boolean(m.spec.deprecationDate)
	);
}

/** "claude opus": the lineage with the vendor's line inside it, since one
 * family alone (e.g. claude) spans a whole host. */
export function modelFamilyName(m: Model): string {
	const parts = [m.spec.family?.trim(), m.spec.productLine?.trim()];
	return parts.filter(Boolean).join(" ") || OTHER_FAMILY;
}

const OTHER_FAMILY = "Other";

/** Whether a filter is narrowing beyond the default (deprecated hidden). */
export function isNarrowing(f: ModelsFilter): boolean {
	return f.q.trim() !== "" || f.cap !== "any";
}

export function modelMatches(m: Model, f: ModelsFilter): boolean {
	if (!f.showDeprecated && isDeprecatedModel(m)) return false;
	if (f.cap !== "any" && m.spec.capabilities?.[f.cap] !== true) return false;
	const q = f.q.trim().toLowerCase();
	if (q === "") return true;
	return [
		displayLabel(m.metadata),
		m.metadata.name,
		m.spec.family,
		m.spec.productLine,
	].some((t) => t?.toLowerCase().includes(q));
}

/** One model as one host serves it. */
export interface ModelLine {
	model: Model;
	/** Absent for usage reported by telemetry, which names no host. */
	host?: MatrixHost;
	/** This host's price for it. */
	price?: PriceRow;
	/** Its traffic on this host over the last week. */
	usage?: ModelUsage;
}

/** The models a host serves, with their specs; a binding whose model the
 * list doesn't hold is left out. */
export function hostLines(
	prices: HostPrices,
	modelsById: ReadonlyMap<string, Model>,
	usage?: ReadonlyMap<string, ModelUsage>,
): ModelLine[] {
	return prices.rows.flatMap((price) => {
		const model = price.served ? modelsById.get(price.model.id) : undefined;
		if (!model) return [];
		return [
			{ model, host: prices.host, price, usage: usage?.get(price.model.id) },
		];
	});
}

const release = (l: ModelLine) => l.model.spec.releaseDate ?? "";
const label = (l: ModelLine) => displayLabel(l.model.metadata);

/** Your spend, then requests, then the newest release, then name. */
function byInterest(a: ModelLine, b: ModelLine): number {
	return (
		(b.usage?.usd ?? 0) - (a.usage?.usd ?? 0) ||
		(b.usage?.requests ?? 0) - (a.usage?.requests ?? 0) ||
		release(b).localeCompare(release(a)) ||
		label(a).localeCompare(label(b))
	);
}

/** Each sort's ascending order. */
const LINE_ORDER: Record<
	ModelsSortKey,
	(a: ModelLine, b: ModelLine) => number
> = {
	spend: (a, b) => -byInterest(a, b),
	newest: (a, b) => release(a).localeCompare(release(b)),
	price: (a, b) =>
		compareBlendedPrices(a.price?.blended ?? null, b.price?.blended ?? null),
	name: (a, b) => label(a).localeCompare(label(b)),
};

/** Lines in the chosen order; ties fall back to your spend, then newest.
 * Unpriced lines stay last under a price sort in either direction. */
export function sortLines(
	lines: readonly ModelLine[],
	sort: ModelsSort,
): ModelLine[] {
	const sign = sort.dir === "asc" ? 1 : -1;
	return [...lines].sort((a, b) => {
		if (sort.key === "price" && (!a.price?.blended || !b.price?.blended)) {
			const missing = Number(!a.price?.blended) - Number(!b.price?.blended);
			if (missing !== 0) return missing;
		}
		return sign * LINE_ORDER[sort.key](a, b) || byInterest(a, b);
	});
}

/** A heading and the lines under it: a family, or a host. */
export interface LineGroup {
	key: string;
	label: string;
	/** Set when the group is a host. */
	host?: MatrixHost;
	lines: ModelLine[];
}

function groupSpend(lines: readonly ModelLine[]) {
	let usd = 0;
	let requests = 0;
	let newest = "";
	for (const l of lines) {
		usd += l.usage?.usd ?? 0;
		requests += l.usage?.requests ?? 0;
		if (release(l) > newest) newest = release(l);
	}
	return { usd, requests, newest };
}

/** Lines under family headings: your spend first, then the newest release,
 * "Other" last; alphabetical under a name sort. */
export function groupByFamily(
	lines: readonly ModelLine[],
	sort: ModelsSort,
): LineGroup[] {
	const byFamily = new Map<string, ModelLine[]>();
	for (const l of lines) {
		const name = modelFamilyName(l.model);
		byFamily.set(name, [...(byFamily.get(name) ?? []), l]);
	}
	const groups = [...byFamily].map(([name, members]) => ({
		key: name,
		label: name,
		lines: sortLines(members, sort),
		...groupSpend(members),
	}));
	const sign = sort.dir === "asc" ? 1 : -1;
	return groups
		.sort(
			(a, b) =>
				Number(a.key === OTHER_FAMILY) - Number(b.key === OTHER_FAMILY) ||
				(sort.key === "name"
					? sign * a.label.localeCompare(b.label)
					: b.usd - a.usd ||
						b.requests - a.requests ||
						b.newest.localeCompare(a.newest) ||
						a.label.localeCompare(b.label)),
		)
		.map(({ key, label, lines }) => ({ key, label, lines }));
}

/** One rail entry: a host and how many of its models the filter keeps. */
export interface RailHost {
	host: MatrixHost;
	count: number;
	usage?: ModelUsage;
}

/** Every host serving a model, in the pricing page's order: spend, requests,
 * catalog size, name. */
export function railHosts(
	matrix: readonly HostPrices[],
	modelsById: ReadonlyMap<string, Model>,
	byHost: ReadonlyMap<string, ModelUsage>,
	filter: ModelsFilter,
): RailHost[] {
	const pricesById = new Map(matrix.map((p) => [p.host.id, p]));
	return hostCards(matrix, byHost).flatMap((card) => {
		const prices = pricesById.get(card.host.id);
		if (!prices) return [];
		const count = hostLines(prices, modelsById).filter((l) =>
			modelMatches(l.model, filter),
		).length;
		return [{ host: card.host, count, usage: card.usage }];
	});
}

/** In use always lists what carried traffic, deprecated or not. */
function inUseFilter(filter: ModelsFilter): ModelsFilter {
	return { ...filter, showDeprecated: true };
}

/** Models with any traffic that the filter keeps, counted once across hosts. */
export function inUseCount(
	byModel: ReadonlyMap<string, ModelUsage>,
	modelsById: ReadonlyMap<string, Model>,
	shown: ModelsFilter,
): number {
	const filter = inUseFilter(shown);
	let n = 0;
	for (const [id, usage] of byModel) {
		const model = modelsById.get(id);
		if (usage.requests > 0 && model && modelMatches(model, filter)) n++;
	}
	return n;
}

/** Usage with no host is telemetry (e.g. OTLP reports): it names a model but
 * went through no relay host. */
export const TELEMETRY_GROUP = "telemetry";

/** Each host's lines with traffic on it, under host headings in rail order,
 * then models whose traffic named no host. Hosts whose per-model usage hasn't
 * loaded are left out. */
export function inUseGroups(
	hosts: readonly HostPrices[],
	modelsById: ReadonlyMap<string, Model>,
	usageByHost: ReadonlyMap<string, ReadonlyMap<string, ModelUsage>>,
	byModel: ReadonlyMap<string, ModelUsage>,
	shown: ModelsFilter,
	sort: ModelsSort,
): LineGroup[] {
	const filter = inUseFilter(shown);
	const groups = hostUseGroups(hosts, modelsById, usageByHost, filter, sort);
	const seen = new Set(
		groups.flatMap((g) => g.lines.map((l) => l.model.metadata.id)),
	);
	const telemetry: ModelLine[] = [];
	for (const [id, usage] of byModel) {
		const model = modelsById.get(id);
		if (
			usage.requests > 0 &&
			model &&
			!seen.has(id) &&
			modelMatches(model, filter)
		)
			telemetry.push({ model, usage });
	}
	if (telemetry.length > 0)
		groups.push({
			key: TELEMETRY_GROUP,
			label: "Reported by telemetry",
			lines: sortLines(telemetry, sort),
		});
	return groups;
}

function hostUseGroups(
	hosts: readonly HostPrices[],
	modelsById: ReadonlyMap<string, Model>,
	usageByHost: ReadonlyMap<string, ReadonlyMap<string, ModelUsage>>,
	filter: ModelsFilter,
	sort: ModelsSort,
): LineGroup[] {
	return hosts.flatMap((prices) => {
		const usage = usageByHost.get(prices.host.id);
		if (!usage) return [];
		const lines = hostLines(prices, modelsById, usage).filter(
			(l) => (l.usage?.requests ?? 0) > 0 && modelMatches(l.model, filter),
		);
		if (lines.length === 0) return [];
		return [
			{
				key: prices.host.id,
				label: prices.host.label,
				host: prices.host,
				lines: sortLines(lines, sort),
			},
		];
	});
}

/** The pane the rail opens: the asked host when it's listed, else "In use"
 * unless usage has loaded and shows no traffic, then the first host. */
export function pickPane(
	asked: string | undefined,
	rail: readonly RailHost[],
	anyTraffic: boolean | undefined,
): string {
	if (asked === IN_USE || rail.some((r) => r.host.slug === asked)) {
		return asked ?? IN_USE;
	}
	if (anyTraffic === false) return rail[0]?.host.slug ?? IN_USE;
	return IN_USE;
}

/** Summed usage; `usd` stays null when none of it was priced. */
export function sumUsage(
	usages: readonly (ModelUsage | undefined)[],
): ModelUsage {
	let requests = 0;
	let usd: number | null = null;
	for (const u of usages) {
		if (!u) continue;
		requests += u.requests;
		if (u.usd != null) usd = (usd ?? 0) + u.usd;
	}
	return { requests, usd };
}

/** "Sep 2026" from a YYYY-MM or YYYY-MM-DD date; null without one. */
export function fmtReleaseMonth(date: string | undefined): string | null {
	const m = /^(\d{4})-(\d{2})/.exec(date ?? "");
	if (!m) return null;
	const month = Number(m[2]);
	if (month < 1 || month > 12) return null;
	const at = new Date(Date.UTC(Number(m[1]), month - 1, 1));
	return at.toLocaleDateString("en-US", {
		month: "short",
		year: "numeric",
		timeZone: "UTC",
	});
}

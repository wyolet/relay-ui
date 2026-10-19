import type { Model } from "@/api/types/model";
import { displayLabel } from "@/lib/displayLabel";

export interface ProductLineGroup {
	line: string;
	models: Model[];
}

export interface FamilyGroup {
	family: string;
	/** Every model in the family, with or without a line. */
	count: number;
	/** Models without a product line; listed ahead of the line groups. */
	unlined: Model[];
	lines: ProductLineGroup[];
}

export function modelFamily(model: Model): string {
	return model.spec.family?.trim() || "Other";
}

export function modelProductLine(model: Model): string | undefined {
	return model.spec.productLine?.trim() || undefined;
}

/** Families and the lines within them sort largest first, then by name;
 * models within a group sort by display label. */
export function groupModelsByFamily(models: readonly Model[]): FamilyGroup[] {
	const byFamily = groupBy(models, modelFamily);
	const families: FamilyGroup[] = [];
	for (const [family, members] of byFamily) {
		const unlined: Model[] = [];
		const lined: Model[] = [];
		for (const m of members) (modelProductLine(m) ? lined : unlined).push(m);
		const lines: ProductLineGroup[] = [];
		for (const [line, ms] of groupBy(lined, (m) => modelProductLine(m) ?? "")) {
			lines.push({ line, models: ms.sort(byLabel) });
		}
		lines.sort(
			(a, b) =>
				b.models.length - a.models.length || a.line.localeCompare(b.line),
		);
		families.push({
			family,
			count: members.length,
			unlined: unlined.sort(byLabel),
			lines,
		});
	}
	return families.sort(
		(a, b) => b.count - a.count || a.family.localeCompare(b.family),
	);
}

/** Distinct product lines across `models`, alphabetical. */
export function distinctProductLines(models: readonly Model[]): string[] {
	const lines = new Set<string>();
	for (const m of models) {
		const line = modelProductLine(m);
		if (line) lines.add(line);
	}
	return [...lines].sort((a, b) => a.localeCompare(b));
}

function groupBy(
	models: readonly Model[],
	keyOf: (m: Model) => string,
): Map<string, Model[]> {
	const out = new Map<string, Model[]>();
	for (const m of models) {
		const key = keyOf(m);
		const arr = out.get(key);
		if (arr) arr.push(m);
		else out.set(key, [m]);
	}
	return out;
}

function byLabel(a: Model, b: Model): number {
	return displayLabel(a.metadata).localeCompare(displayLabel(b.metadata));
}

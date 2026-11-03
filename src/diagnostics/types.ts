import type { ObjectRoute } from "@/diagnostics/objectRoutes";

export type Severity = "error" | "warn" | "info";

export interface DiagLink {
	to: ObjectRoute;
	params: { name: string };
}

export interface Diagnostic {
	severity: Severity;
	code: string;
	message: string;
	link?: DiagLink;
}

export const SEVERITY_RANK: Record<Severity, number> = {
	info: 0,
	warn: 1,
	error: 2,
};

export function worstSeverity(diagnostics: Diagnostic[]): Severity | undefined {
	if (diagnostics.length === 0) return undefined;
	let worst: Severity = "info";
	for (const d of diagnostics) {
		if (SEVERITY_RANK[d.severity] > SEVERITY_RANK[worst]) worst = d.severity;
	}
	return worst;
}

import type { Severity } from "@/diagnostics/types";

/** One line counting diagnostics per severity, e.g. "2 errors · 1 warning". */
export function diagnosticSummary(
	diagnostics: readonly { severity: Severity }[],
): string {
	const count = (s: Severity) =>
		diagnostics.filter((d) => d.severity === s).length;
	const errors = count("error");
	const warnings = count("warn");
	const infos = count("info");
	return [
		errors && `${errors} error${errors === 1 ? "" : "s"}`,
		warnings && `${warnings} warning${warnings === 1 ? "" : "s"}`,
		infos && `${infos} info`,
	]
		.filter(Boolean)
		.join(" · ");
}

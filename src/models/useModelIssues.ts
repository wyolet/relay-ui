import type { Diagnostic } from "@/diagnostics/types";
import { useModelDiagnostics } from "@/diagnostics/useDiagnostics";

export interface ModelIssues {
	diagnostics: Diagnostic[];
	/** "1 error · 2 warnings · 1 info", skipping zero counts. */
	summary: string;
}

export function useModelIssues(modelId: string | undefined): ModelIssues {
	const diagnostics = useModelDiagnostics(modelId);
	const counts = {
		error: diagnostics.filter((d) => d.severity === "error").length,
		warn: diagnostics.filter((d) => d.severity === "warn").length,
		info: diagnostics.filter((d) => d.severity === "info").length,
	};
	const summary = [
		counts.error && `${counts.error} error${counts.error === 1 ? "" : "s"}`,
		counts.warn && `${counts.warn} warning${counts.warn === 1 ? "" : "s"}`,
		counts.info && `${counts.info} info`,
	]
		.filter(Boolean)
		.join(" · ");
	return { diagnostics, summary };
}

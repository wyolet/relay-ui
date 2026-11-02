import type { PlanIssue } from "@/api/hooks/planIssues";
import { objectRoute } from "@/diagnostics/objectRoutes";
import type { Diagnostic } from "@/diagnostics/types";

/** A plan-engine issue in the shape the issues panels render, linking its first ref the UI has a page for. */
export function planIssueDiagnostic(issue: PlanIssue): Diagnostic {
	const diagnostic: Diagnostic = {
		severity: issue.severity === "warning" ? "warn" : "error",
		code: `plan.${issue.code}`,
		message: issue.message,
	};
	for (const ref of issue.refs ?? []) {
		const to = objectRoute(ref.kind);
		if (to && ref.id)
			return { ...diagnostic, link: { to, params: { name: ref.id } } };
	}
	return diagnostic;
}

import type { PlanIssue } from "@/api/hooks/planIssues";
import { objectRoute } from "@/diagnostics/objectRoutes";
import type { Diagnostic } from "@/diagnostics/types";
import { PERSONAL_ACCOUNT_OFF } from "@/lib/personalAccount";

// Codes the UI words itself; every other issue shows relay's message.
const PLAN_ISSUE_COPY = new Map<string, string>([
	[
		PERSONAL_ACCOUNT_OFF,
		"Personal accounts are turned off for this user; use a team or project key.",
	],
]);

export function planIssueMessage(issue: PlanIssue): string {
	return PLAN_ISSUE_COPY.get(issue.code) ?? issue.message;
}

/** A plan-engine issue in the shape the issues panels render, linking its first ref the UI has a page for. */
export function planIssueDiagnostic(issue: PlanIssue): Diagnostic {
	const diagnostic: Diagnostic = {
		severity: issue.severity === "warning" ? "warn" : "error",
		code: `plan.${issue.code}`,
		message: planIssueMessage(issue),
	};
	for (const ref of issue.refs ?? []) {
		const to = objectRoute(ref.kind);
		if (to && ref.id)
			return { ...diagnostic, link: { to, params: { name: ref.id } } };
	}
	return diagnostic;
}

import { objectRef, type PlanIssue } from "@/api/hooks/planIssues";
import { objectLabel, objectRoute } from "@/diagnostics/objectRoutes";
import type { DiagLink, Diagnostic } from "@/diagnostics/types";

/**
 * A plan-engine issue in the shape the issues panels render. Shown on the
 * page of `self` (`kind:id`), an issue another object carries names that
 * object and links to it; otherwise it links its first ref the UI has a page for.
 */
export function planIssueDiagnostic(
	issue: PlanIssue,
	self?: string,
): Diagnostic {
	const severity = issue.severity === "warning" ? "warn" : "error";
	const code = `plan.${issue.code}`;
	if (self !== undefined && objectRef(issue.kind, issue.id) !== self) {
		return {
			severity,
			code,
			message: `${planIssueSubject(issue)}: ${issue.message}`,
			link: objectLink(issue.kind, issue.name),
		};
	}
	const link = (issue.refs ?? [])
		.filter((ref) => !ref.id || objectRef(ref.kind, ref.id) !== self)
		.map((ref) => objectLink(ref.kind, ref.name))
		.find((l) => l !== undefined);
	return { severity, code, message: issue.message, link };
}

/** "Pool main": the object carrying the issue, by label and slug. */
export function planIssueSubject(issue: PlanIssue): string {
	const label = objectLabel(issue.kind);
	return issue.name ? `${label} ${issue.name}` : label;
}

/** A detail-page link by slug; none for kinds without a page or rows the caller can't see. */
function objectLink(kind: string, name: string): DiagLink | undefined {
	const to = objectRoute(kind);
	return to && name ? { to, params: { name } } : undefined;
}

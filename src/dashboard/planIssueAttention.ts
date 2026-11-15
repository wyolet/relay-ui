import type { PlanIssue } from "@/api/hooks/planIssues";
import { objectRoute } from "@/diagnostics/objectRoutes";
import { planIssueSubject } from "@/diagnostics/planIssues";
import type { AttentionItem } from "./useAttention";

/** Beyond this many, the rest fold into one count line. */
const SHOWN = 5;

/** Codes whose server message ends in a raw error chain: the line says what
 * is wrong, the hover keeps the chain. */
const SHORT_MESSAGE: Record<string, string> = {
	credential_unresolved: "its value can't be resolved",
};

/** Plan issues as attention lines, errors first, each linking to its object. */
export function planIssueAttention(
	issues: readonly PlanIssue[],
): AttentionItem[] {
	const sorted = [...issues].sort(
		(a, b) => Number(b.severity === "error") - Number(a.severity === "error"),
	);
	const lines: AttentionItem[] = sorted.slice(0, SHOWN).map((issue) => {
		const to = objectRoute(issue.kind);
		const ref = issue.name || issue.id;
		const subject = planIssueSubject(issue);
		const short = SHORT_MESSAGE[issue.code];
		return {
			key: `plan-${issue.kind}-${issue.id}-${issue.code}`,
			tone: issue.severity === "error" ? "alert" : "warn",
			text: `${subject}: ${short ?? issue.message}`,
			detail: short ? `${subject}: ${issue.message}` : undefined,
			target: to && ref ? { kind: "object", to, name: ref } : { kind: "none" },
		};
	});
	const rest = sorted.length - lines.length;
	if (rest > 0) {
		lines.push({
			key: "plan-more",
			tone: sorted.slice(SHOWN).some((i) => i.severity === "error")
				? "alert"
				: "warn",
			text: `${rest} more configuration issue${rest === 1 ? "" : "s"}`,
			target: { kind: "none" },
		});
	}
	return lines;
}

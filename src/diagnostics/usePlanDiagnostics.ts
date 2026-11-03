import {
	objectRef,
	usePageIssues,
	usePlanIssuesByObject,
} from "@/api/hooks/planIssues";
import type { ObjectKind } from "@/diagnostics/objectRoutes";
import { planIssueDiagnostic } from "@/diagnostics/planIssues";
import type { Diagnostic } from "@/diagnostics/types";

/**
 * A detail page's plan issues: those on the object or naming it, plus those
 * about `related` objects (`kind:id`). Nothing until the object's id is known.
 */
export function usePlanDiagnostics(
	kind: ObjectKind,
	id: string | undefined,
	related: readonly string[] = [],
): Diagnostic[] {
	const self = id ? objectRef(kind, id) : undefined;
	const issues = usePageIssues(self ? [self, ...related] : []);
	return issues.map((issue) => planIssueDiagnostic(issue, self));
}

/** A table row's plan issues, picked from the one read of every issue the table shares. */
export function useRowPlanDiagnostics(
	kind: ObjectKind,
	id: string | undefined,
): Diagnostic[] {
	const byObject = usePlanIssuesByObject();
	if (!id) return [];
	const self = objectRef(kind, id);
	return (byObject.get(self) ?? []).map((issue) =>
		planIssueDiagnostic(issue, self),
	);
}

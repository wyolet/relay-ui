import { DiagnosticList } from "@/diagnostics/DiagnosticList";
import type { ObjectKind } from "@/diagnostics/objectRoutes";
import type { Diagnostic } from "@/diagnostics/types";
import { usePlanDiagnostics } from "@/diagnostics/usePlanDiagnostics";
import { diagnosticSummary } from "@/lib/diagnosticSummary";
import { SectionTitle } from "@/shared/SectionTitle";

/** A detail page's diagnostics with a per-severity count; nothing when clean. */
export function IssuesPanel({ diagnostics }: { diagnostics: Diagnostic[] }) {
	if (diagnostics.length === 0) return null;
	return (
		<section>
			<SectionTitle aside={diagnosticSummary(diagnostics)}>Issues</SectionTitle>
			<DiagnosticList diagnostics={diagnostics} />
		</section>
	);
}

/** Relay's plan issues about an object, and about `related` objects (`kind:id`). */
export function PlanIssuesPanel({
	kind,
	id,
	related,
}: {
	kind: ObjectKind;
	id: string | undefined;
	related?: readonly string[];
}) {
	return <IssuesPanel diagnostics={usePlanDiagnostics(kind, id, related)} />;
}

import { DiagnosticList } from "@/diagnostics/DiagnosticList";
import type { Diagnostic } from "@/diagnostics/types";
import { usePlanDiagnostics } from "@/diagnostics/useDiagnostics";
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

/** Relay's plan issues for an object the UI runs no checks of its own on. */
export function PlanIssuesPanel({
	kind,
	id,
}: {
	kind: string;
	id: string | undefined;
}) {
	return <IssuesPanel diagnostics={usePlanDiagnostics(kind, id)} />;
}

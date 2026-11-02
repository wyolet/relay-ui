import { DiagnosticList } from "@/diagnostics/DiagnosticList";
import type { Diagnostic } from "@/diagnostics/types";
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

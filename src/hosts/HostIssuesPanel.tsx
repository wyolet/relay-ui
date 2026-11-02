import { DiagnosticList } from "@/diagnostics/DiagnosticList";
import { useHostDiagnostics } from "@/diagnostics/useDiagnostics";
import { SectionTitle } from "@/hosts/HostDetailKit";
import { diagnosticSummary } from "@/lib/diagnosticSummary";

export function HostIssuesPanel({ hostId }: { hostId: string | undefined }) {
	const diagnostics = useHostDiagnostics(hostId);
	if (diagnostics.length === 0) return null;
	return (
		<section>
			<div className="mb-2 flex items-baseline justify-between gap-2">
				<SectionTitle>Issues</SectionTitle>
				<span className="text-[10px] text-muted-foreground tabular-nums">
					{diagnosticSummary(diagnostics)}
				</span>
			</div>
			<DiagnosticList diagnostics={diagnostics} />
		</section>
	);
}

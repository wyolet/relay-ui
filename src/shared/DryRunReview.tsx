import type { ReactNode } from "react";
import type { PlannedRowLists } from "@/pseudo/dryRun";
import { DryRunWarnings } from "@/shared/DryRunWarnings";
import { PlannedRows } from "@/shared/PlannedRows";
import { RefusedIssues } from "@/shared/RefusedIssues";

/** A one-request form's last step: what relay would refuse or warn about, why it refused, and the rows its dry run plans. */
export function DryRunReview({
	issues,
	warnings,
	refusalMessage,
	rows,
	label,
	loading,
	stale,
	nothingPlanned,
}: {
	issues: readonly string[] | undefined;
	warnings: readonly string[] | undefined;
	refusalMessage: string | undefined;
	rows: PlannedRowLists;
	/** Names the list, e.g. "What Create agent makes". */
	label: string;
	loading: boolean;
	stale: boolean;
	/** In place of the list once the dry run says nothing would be written. */
	nothingPlanned?: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-3">
			<RefusedIssues messages={issues} />
			<DryRunWarnings messages={warnings} />
			{refusalMessage && (
				<p role="alert" className="text-[11px] text-destructive">
					{refusalMessage}
				</p>
			)}
			{nothingPlanned ?? (
				<PlannedRows
					rows={rows}
					label={label}
					loading={loading}
					stale={stale}
				/>
			)}
		</div>
	);
}

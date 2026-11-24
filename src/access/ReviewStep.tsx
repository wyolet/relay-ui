import { ListChecks } from "lucide-react";
import type { useSetAccessForm } from "@/access/useSetAccessForm";
import { DryRunWarnings } from "@/shared/DryRunWarnings";
import { FormSection } from "@/shared/FormSection";
import { PlannedRows } from "@/shared/PlannedRows";
import { RefusedIssues } from "@/shared/RefusedIssues";
import { WriteList } from "@/shared/WriteList";

type SetAccessForm = ReturnType<typeof useSetAccessForm>;

function NoWritesLine({ access }: { access: SetAccessForm }) {
	return <p className="text-xs text-muted-foreground">{access.noWritesLine}</p>;
}

function OneRequestReview({ access }: { access: SetAccessForm }) {
	return (
		<div className="flex flex-col gap-3">
			<RefusedIssues messages={access.issueMessages} />
			<DryRunWarnings messages={access.previewWarnings} />
			{access.refusalMessage && (
				<p role="alert" className="text-[11px] text-destructive">
					{access.refusalMessage}
				</p>
			)}
			{access.nothingChanged ? (
				<NoWritesLine access={access} />
			) : (
				<PlannedRows
					rows={access.previewRows}
					label="What Save access does"
					loading={access.previewLoading}
					stale={access.previewStale}
				/>
			)}
		</div>
	);
}

function ChainReview({ access }: { access: SetAccessForm }) {
	if (access.planned.length === 0) return <NoWritesLine access={access} />;
	return (
		<div className="flex flex-col gap-3">
			<WriteList
				items={access.planned.map((w) => ({
					id: w.id,
					label: w.label,
					status: "waiting",
				}))}
			/>
			{access.unlinksPools && (
				<p className="text-xs text-muted-foreground">
					Pools no longer linked are kept; delete them from Pools if unused.
				</p>
			)}
		</div>
	);
}

export function ReviewStep({ access }: { access: SetAccessForm }) {
	return (
		<FormSection
			icon={ListChecks}
			title="On save"
			description={
				access.oneRequest
					? "What Save access does, in one request. Relay does all of it or none."
					: "What Save access does, in this order."
			}
		>
			{access.oneRequest ? (
				<OneRequestReview access={access} />
			) : (
				<ChainReview access={access} />
			)}
		</FormSection>
	);
}

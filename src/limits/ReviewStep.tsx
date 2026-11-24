import { CircleDollarSign, ListChecks } from "lucide-react";
import type { UnpricedWarning } from "@/limits/limitWrites";
import type { useAddLimitForm } from "@/limits/useAddLimitForm";
import { UnpricedGrantList } from "@/policies/UnpricedUnderBudget";
import { AlertBanner } from "@/shared/AlertBanner";
import { DryRunReview } from "@/shared/DryRunReview";
import { FormSection } from "@/shared/FormSection";
import { MessagesBanner } from "@/shared/MessagesBanner";
import { WriteList } from "@/shared/WriteList";

type AddLimitForm = ReturnType<typeof useAddLimitForm>;

const UNPRICED_TITLE = "These models will be refused once the cap applies";

function UnpricedList({ unpriced }: { unpriced: UnpricedWarning }) {
	switch (unpriced.kind) {
		case "none":
			return null;
		case "noPolicy":
			return (
				<p className="text-xs text-muted-foreground">
					Models without a price are refused under a spend cap.
				</p>
			);
		case "grants":
			return (
				<AlertBanner
					severity="warn"
					title={UNPRICED_TITLE}
					body={<UnpricedGrantList grants={unpriced.grants} />}
				/>
			);
		case "models":
			return (
				<MessagesBanner
					severity="warn"
					title={UNPRICED_TITLE}
					messages={unpriced.models}
					role="status"
				/>
			);
	}
}

export function ReviewStep({ limit }: { limit: AddLimitForm }) {
	return (
		<div className="divide-y divide-border">
			{limit.unpriced.kind !== "none" && (
				<FormSection
					icon={CircleDollarSign}
					title="Unpriced models"
					description="Relay can't count spend on a model without a price, so a spend cap refuses it (403 unpriced_under_budget)."
				>
					<UnpricedList unpriced={limit.unpriced} />
				</FormSection>
			)}

			<FormSection
				icon={ListChecks}
				title="On save"
				description={
					limit.oneRequest
						? "What Add limit makes and changes, in one request. Relay does all of it or none."
						: "What Add limit does, in this order."
				}
			>
				{limit.oneRequest ? (
					<DryRunReview
						issues={limit.refusedIssues}
						warnings={limit.previewWarnings}
						refusalMessage={limit.refusalMessage}
						rows={limit.previewRows}
						label="What Add limit does"
						loading={limit.previewLoading}
						stale={limit.previewStale}
					/>
				) : (
					<WriteList
						items={limit.planned.map((w) => ({
							id: w.id,
							label: w.label,
							status: "waiting",
						}))}
					/>
				)}
			</FormSection>
		</div>
	);
}

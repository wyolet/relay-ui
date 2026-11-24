import { CircleDollarSign, ListChecks } from "lucide-react";
import type { useAddLimitForm } from "@/limits/useAddLimitForm";
import { UnpricedGrantList } from "@/policies/UnpricedUnderBudget";
import { AlertBanner } from "@/shared/AlertBanner";
import { FormSection } from "@/shared/FormSection";
import { WriteList } from "@/shared/WriteList";

type AddLimitForm = ReturnType<typeof useAddLimitForm>;

export function ReviewStep({ limit }: { limit: AddLimitForm }) {
	const { unpriced } = limit;
	return (
		<div className="divide-y divide-border">
			{unpriced.kind !== "none" && (
				<FormSection
					icon={CircleDollarSign}
					title="Unpriced models"
					description="Relay can't count spend on a model without a price, so a spend cap refuses it (403 unpriced_under_budget)."
				>
					{unpriced.kind === "noPolicy" ? (
						<p className="text-xs text-muted-foreground">
							Models without a price are refused under a spend cap.
						</p>
					) : (
						<AlertBanner
							severity="warn"
							title="These models will be refused once the cap applies"
							body={<UnpricedGrantList grants={unpriced.grants} />}
						/>
					)}
				</FormSection>
			)}

			<FormSection
				icon={ListChecks}
				title="On save"
				description="What Add limit does, in this order."
			>
				<WriteList
					items={limit.planned.map((w) => ({
						id: w.id,
						label: w.label,
						status: "waiting",
					}))}
				/>
			</FormSection>
		</div>
	);
}

import { ListChecks, Share2 } from "lucide-react";
import { useId } from "react";
import { receiverKey } from "@/byok/byokChoices";
import type { useByokForm } from "@/byok/useByokForm";
import { DryRunWarnings } from "@/shared/DryRunWarnings";
import { FieldError } from "@/shared/FieldError";
import { FormSection } from "@/shared/FormSection";
import { BoxedCheckList } from "@/shared/MultiSelect";
import { PlannedRows } from "@/shared/PlannedRows";
import { RefusedIssues } from "@/shared/RefusedIssues";
import { WriteList } from "@/shared/WriteList";

type ByokForm = ReturnType<typeof useByokForm>;

const KIND_LABEL = { team: "Team", project: "Project" } as const;

export function SharingStep({ byok }: { byok: ByokForm }) {
	const receiversErrorId = useId();
	const { finishLabel } = byok;
	const hostLabel = byok.host?.label ?? "This provider";
	return (
		<div className="divide-y divide-border">
			<FormSection
				icon={Share2}
				title="Share with"
				description="Teams and projects that may use the account besides its owner. A share is used once an agent or a policy there picks the account; leave it empty to keep the account to its owner."
			>
				{byok.keyless ? (
					<p className="text-xs text-muted-foreground">
						{hostLabel} takes no key: relay reaches it through pools, not
						accounts, so a share would change nothing.
					</p>
				) : (
					<fieldset
						aria-label="Share with"
						aria-describedby={
							byok.errors.receiverKeys ? receiversErrorId : undefined
						}
						className="min-w-0"
					>
						<BoxedCheckList
							options={byok.receivers.map((r) => ({
								value: receiverKey(r),
								label: r.label,
								hint: KIND_LABEL[r.kind],
							}))}
							selected={byok.values.receiverKeys}
							onToggle={byok.toggleReceiver}
							emptyLabel="teams or projects"
						/>
						<FieldError
							id={receiversErrorId}
							message={byok.errors.receiverKeys}
						/>
					</fieldset>
				)}
			</FormSection>

			<FormSection
				icon={ListChecks}
				title="On create"
				description={
					!byok.oneRequest
						? `What ${finishLabel} does, in this order.`
						: byok.keyless
							? `What ${finishLabel} makes, in one request. Relay makes all of it or none.`
							: `What ${finishLabel} makes, in one request. Relay checks the key with the provider first, then makes all of it or none.`
				}
			>
				{byok.oneRequest ? (
					<div className="flex flex-col gap-3">
						<RefusedIssues messages={byok.onCreateIssues} />
						<DryRunWarnings messages={byok.previewWarnings} />
						{byok.refusalMessage && (
							<p role="alert" className="text-[11px] text-destructive">
								{byok.refusalMessage}
							</p>
						)}
						<PlannedRows
							rows={byok.previewRows}
							label={`What ${finishLabel} makes`}
							loading={byok.previewLoading}
							stale={byok.previewStale}
						/>
					</div>
				) : (
					<WriteList
						items={byok.planned.map((w) => ({
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

import { ListChecks, Tag } from "lucide-react";
import { useId } from "react";
import type { useAddAgentForm } from "@/agents/useAddAgentForm";
import { Input } from "@/components/ui/input";
import { KeySettingsSections } from "@/keys/KeySettingsSections";
import { DryRunWarnings } from "@/shared/DryRunWarnings";
import { FieldError } from "@/shared/FieldError";
import { FormSection } from "@/shared/FormSection";
import { PlannedRows } from "@/shared/PlannedRows";
import { RefusedIssues } from "@/shared/RefusedIssues";
import { WriteList } from "@/shared/WriteList";

type AddAgentForm = ReturnType<typeof useAddAgentForm>;

export function KeyStep({ agent }: { agent: AddAgentForm }) {
	const { values, errors, setKeyAnswers } = agent;
	const keyNameErrorId = useId();
	return (
		<div className="divide-y divide-border">
			<FormSection
				icon={Tag}
				title="Key name"
				description="The agent's first key. Leave it empty to name the key after the agent."
			>
				<Input
					type="text"
					className="w-full max-w-md"
					value={values.keyName}
					onChange={(e) => setKeyAnswers({ keyName: e.currentTarget.value })}
					placeholder={agent.keyNamePlaceholder}
					aria-label="Key name"
					aria-invalid={errors.keyName ? true : undefined}
					aria-describedby={errors.keyName ? keyNameErrorId : undefined}
				/>
				<FieldError id={keyNameErrorId} message={errors.keyName} />
			</FormSection>

			<KeySettingsSections
				settings={values}
				onExpiresAtChange={(v) => setKeyAnswers({ expiresAt: v })}
				onPassthroughAllowedChange={(v) =>
					setKeyAnswers({ passthroughAllowed: v })
				}
				onPayloadLoggingEnabledChange={(v) =>
					setKeyAnswers({ payloadLoggingEnabled: v })
				}
			/>

			<FormSection
				icon={ListChecks}
				title="On create"
				description={
					agent.oneRequest
						? "What Create agent makes, in one request. Relay makes all of it or none."
						: "What Create agent does, in this order."
				}
			>
				{agent.oneRequest ? (
					<div className="flex flex-col gap-3">
						<RefusedIssues messages={agent.onCreateIssues} />
						<DryRunWarnings messages={agent.previewWarnings} />
						{agent.refusalMessage && (
							<p role="alert" className="text-[11px] text-destructive">
								{agent.refusalMessage}
							</p>
						)}
						<PlannedRows
							rows={agent.previewRows}
							label="What Create agent makes"
							loading={agent.previewLoading}
							stale={agent.previewStale}
						/>
					</div>
				) : (
					<WriteList
						items={agent.planned.map((w) => ({
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

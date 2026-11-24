import { ListChecks, Tag } from "lucide-react";
import { useId } from "react";
import type { useAddAgentForm } from "@/agents/useAddAgentForm";
import { Input } from "@/components/ui/input";
import { KeySettingsSections } from "@/keys/KeySettingsSections";
import { FieldError } from "@/shared/FieldError";
import { FormSection } from "@/shared/FormSection";
import { WriteList } from "@/shared/WriteList";

type AddAgentForm = ReturnType<typeof useAddAgentForm>;

export function KeyStep({ agent }: { agent: AddAgentForm }) {
	const { form, values, errors } = agent;
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
					onChange={(e) => form.setFieldValue("keyName", e.currentTarget.value)}
					placeholder={agent.keyNamePlaceholder}
					aria-label="Key name"
					aria-invalid={errors.keyName ? true : undefined}
					aria-describedby={errors.keyName ? keyNameErrorId : undefined}
				/>
				<FieldError id={keyNameErrorId} message={errors.keyName} />
			</FormSection>

			<KeySettingsSections
				settings={values}
				onExpiresAtChange={(v) => form.setFieldValue("expiresAt", v)}
				onPassthroughAllowedChange={(v) =>
					form.setFieldValue("passthroughAllowed", v)
				}
				onPayloadLoggingEnabledChange={(v) =>
					form.setFieldValue("payloadLoggingEnabled", v)
				}
			/>

			<FormSection
				icon={ListChecks}
				title="On create"
				description="What Create agent does, in this order."
			>
				<WriteList
					items={agent.planned.map((w) => ({
						id: w.id,
						label: w.label,
						status: "waiting",
					}))}
				/>
			</FormSection>
		</div>
	);
}

import { KeyStep } from "@/byok/KeyStep";
import { ProviderStep } from "@/byok/ProviderStep";
import { SharingStep } from "@/byok/SharingStep";
import { StoredStep } from "@/byok/StoredStep";
import {
	BYOK_FORM_STEPS,
	type ByokFormStep,
	useByokForm,
} from "@/byok/useByokForm";
import { RefusedIssues } from "@/shared/RefusedIssues";
import { StepForm } from "@/shared/StepForm";

const STEP_LABELS: Record<ByokFormStep, string> = {
	provider: "Provider",
	key: "Key",
	sharing: "Sharing",
};

const STEPS = [
	...BYOK_FORM_STEPS.map((id) => ({ id, label: STEP_LABELS[id] })),
	{ id: "stored", label: "Done" },
];

export function Byok({ onCancel }: { onCancel: () => void }) {
	const byok = useByokForm();
	const { step, stored } = byok;
	return (
		<StepForm
			steps={STEPS}
			form={byok}
			finishLabel={byok.finishLabel}
			runTitle={byok.keyless ? "Saving the account" : "Storing the key"}
			result={stored && <StoredStep stored={stored} />}
			onCancel={onCancel}
		>
			<RefusedIssues messages={byok.stepIssues} />
			{step === "provider" && <ProviderStep byok={byok} />}
			{step === "key" && <KeyStep byok={byok} />}
			{step === "sharing" && <SharingStep byok={byok} />}
		</StepForm>
	);
}

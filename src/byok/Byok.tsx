import { KeyStep } from "@/byok/KeyStep";
import { ProviderStep } from "@/byok/ProviderStep";
import { SharingStep } from "@/byok/SharingStep";
import { StoredStep } from "@/byok/StoredStep";
import {
	BYOK_FORM_STEPS,
	type ByokFormStep,
	useByokForm,
} from "@/byok/useByokForm";
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
	const { step, writes } = byok;
	return (
		<StepForm
			steps={STEPS}
			form={byok}
			finishLabel="Store key"
			runTitle="Storing the key"
			result={writes.stored && <StoredStep stored={writes.stored} />}
			onCancel={onCancel}
		>
			{step === "provider" && <ProviderStep byok={byok} />}
			{step === "key" && <KeyStep byok={byok} />}
			{step === "sharing" && <SharingStep byok={byok} />}
		</StepForm>
	);
}

import { KeyStep } from "@/byok/KeyStep";
import { ProviderStep } from "@/byok/ProviderStep";
import { SharingStep } from "@/byok/SharingStep";
import { StoredStep } from "@/byok/StoredStep";
import {
	BYOK_FORM_STEPS,
	type ByokFormStep,
	useByokForm,
} from "@/byok/useByokForm";
import { Button } from "@/components/ui/button";
import { StickyFooter } from "@/shared/FormFooter";
import { Stepper } from "@/shared/Stepper";
import { WriteRun } from "@/shared/WriteRun";

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
	const { step, stepIndex, lastStep, writes } = byok;

	if (writes.phase !== "idle") {
		return (
			<div className="flex flex-col gap-8">
				<Stepper steps={STEPS} current={BYOK_FORM_STEPS.length} />
				{writes.stored ? (
					<StoredStep stored={writes.stored} />
				) : (
					<WriteRun
						title="Storing the key"
						phase={writes.phase}
						items={writes.steps.map(({ write, status }) => ({
							id: write.id,
							label: write.label,
							status,
						}))}
						error={writes.error}
						onRetry={() => void writes.retry()}
					/>
				)}
			</div>
		);
	}

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				byok.next();
			}}
			className="flex flex-col gap-8"
		>
			<Stepper steps={STEPS} current={stepIndex} />

			{step === "provider" && <ProviderStep byok={byok} />}
			{step === "key" && <KeyStep byok={byok} />}
			{step === "sharing" && <SharingStep byok={byok} />}

			<StickyFooter>
				<Button type="button" variant="outline" size="lg" onClick={onCancel}>
					Cancel
				</Button>
				{stepIndex > 0 && (
					<Button type="button" variant="outline" size="lg" onClick={byok.back}>
						Back
					</Button>
				)}
				<Button type="submit" variant="cta" size="lg">
					{lastStep ? "Store key" : "Next"}
				</Button>
			</StickyFooter>
		</form>
	);
}

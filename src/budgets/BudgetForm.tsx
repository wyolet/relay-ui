import { Wallet } from "lucide-react";
import type { Budget } from "@/api/hooks/budgets";
import { BudgetCapFields } from "@/budgets/BudgetCapFields";
import { useBudgetForm } from "@/budgets/useBudgetForm";
import { FormFooter } from "@/shared/FormFooter";
import { FormSection } from "@/shared/FormSection";
import { IdentitySection } from "@/shared/IdentitySection";

interface BudgetFormProps {
	budget?: Budget;
	onSaved: (savedName: string) => void;
	onCancel: () => void;
}

export function BudgetForm({ budget, onSaved, onCancel }: BudgetFormProps) {
	const { form, values, errors, isEdit, slugPreview, placement, setAmount } =
		useBudgetForm({ budget, onSaved });

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				void form.handleSubmit();
			}}
			className="flex flex-col"
		>
			<div className="divide-y divide-border">
				<IdentitySection
					displayName={values.displayName}
					description={values.description}
					onDisplayNameChange={(v) => form.setFieldValue("displayName", v)}
					onDescriptionChange={(v) => form.setFieldValue("description", v)}
					slugPreview={slugPreview}
					displayNameError={errors.displayName}
					descriptionError={errors.description}
					autoFocus={!isEdit}
					placeholder="Monthly team cap"
					placement={placement}
				/>

				<FormSection
					icon={Wallet}
					title="Cap"
					description="Spend allowed per calendar period, in UTC. A policy that links this budget enforces it on the requests it governs."
				>
					<BudgetCapFields
						amountUsd={values.amountUsd}
						period={values.period}
						mode={values.mode}
						onAmountChange={setAmount}
						onPeriodChange={(p) => form.setFieldValue("period", p)}
						onModeChange={(m) => form.setFieldValue("mode", m)}
						amountError={errors.amountUsd}
					/>
				</FormSection>
			</div>

			<form.Subscribe selector={(s) => s.isSubmitting}>
				{(isSubmitting) => (
					<FormFooter
						isEdit={isEdit}
						isSubmitting={isSubmitting}
						onCancel={onCancel}
					/>
				)}
			</form.Subscribe>
		</form>
	);
}

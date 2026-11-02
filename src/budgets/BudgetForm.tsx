import { Wallet } from "lucide-react";
import { useId } from "react";
import type { Budget } from "@/api/hooks/budgets";
import {
	BUDGET_MODES,
	BUDGET_PERIODS,
	MODE_LABELS,
	PERIOD_LABELS,
} from "@/budgets/budgetFormat";
import { useBudgetForm } from "@/budgets/useBudgetForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSection } from "@/shared/FormSection";
import { IdentitySection } from "@/shared/IdentitySection";
import { OwnerSection } from "@/shared/OwnerSection";
import { Segmented } from "@/shared/Segmented";

const PERIOD_OPTIONS = BUDGET_PERIODS.map((p) => ({
	value: p,
	label: PERIOD_LABELS[p],
}));
const MODE_OPTIONS = BUDGET_MODES.map((m) => ({
	value: m,
	label: MODE_LABELS[m].label,
}));

interface BudgetFormProps {
	budget?: Budget;
	onSaved: (savedName: string) => void;
	onCancel: () => void;
}

export function BudgetForm({ budget, onSaved, onCancel }: BudgetFormProps) {
	const { form, values, errors, isEdit, slugPreview, ownerOptions, setAmount } =
		useBudgetForm({ budget, onSaved });
	const amountErrorId = useId();

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
				/>

				<OwnerSection
					options={ownerOptions}
					value={values.owner}
					onChange={(v) => form.setFieldValue("owner", v)}
					error={errors.owner}
				/>

				<FormSection
					icon={Wallet}
					title="Cap"
					description="Spend allowed per calendar period, in UTC. A policy that links this budget enforces it on the requests it governs."
				>
					<div className="flex flex-col gap-4">
						<div>
							<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
								Amount (USD)
							</div>
							<Input
								type="text"
								inputMode="decimal"
								value={values.amountUsd}
								onChange={(e) => setAmount(e.currentTarget.value)}
								placeholder="2000"
								className="w-full max-w-xs tabular-nums"
								aria-label="Amount in USD"
								aria-invalid={errors.amountUsd ? true : undefined}
								aria-describedby={errors.amountUsd ? amountErrorId : undefined}
							/>
							{errors.amountUsd && (
								<p
									id={amountErrorId}
									className="mt-1.5 text-[11px] text-destructive"
								>
									{errors.amountUsd}
								</p>
							)}
						</div>
						<div>
							<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
								Period
							</div>
							<Segmented
								options={PERIOD_OPTIONS}
								value={values.period}
								onChange={(p) => form.setFieldValue("period", p)}
							/>
						</div>
						<div>
							<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
								Mode
							</div>
							<Segmented
								options={MODE_OPTIONS}
								value={values.mode}
								onChange={(m) => form.setFieldValue("mode", m)}
							/>
							<p className="mt-1.5 text-[11px] text-muted-foreground">
								{MODE_LABELS[values.mode].hint}
							</p>
						</div>
					</div>
				</FormSection>
			</div>

			<div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border mt-6 -mx-6 px-6 py-3 flex items-center justify-end gap-2">
				<Button type="button" variant="outline" size="lg" onClick={onCancel}>
					Cancel
				</Button>
				<form.Subscribe selector={(s) => s.isSubmitting}>
					{(isSubmitting) => (
						<Button
							type="submit"
							variant="cta"
							size="lg"
							disabled={isSubmitting}
						>
							{isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Create"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}

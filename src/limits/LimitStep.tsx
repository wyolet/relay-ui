import { Boxes, Gauge, Tag } from "lucide-react";
import { useId } from "react";
import { BudgetCapFields } from "@/budgets/BudgetCapFields";
import { Input } from "@/components/ui/input";
import type { LimitKind } from "@/limits/limitWrites";
import { RateLimitFields } from "@/limits/RateLimitFields";
import type { useAddLimitForm } from "@/limits/useAddLimitForm";
import { ModelPicker } from "@/models/ModelPicker";
import { PolicyLine } from "@/policy-bindings/PolicyLine";
import { FieldError } from "@/shared/FieldError";
import { FormSection } from "@/shared/FormSection";
import { Segmented } from "@/shared/Segmented";
import { ToggleSwitch } from "@/shared/ToggleSwitch";

type AddLimitForm = ReturnType<typeof useAddLimitForm>;

const KIND_OPTIONS: { value: LimitKind; label: string }[] = [
	{ value: "budget", label: "Spend cap" },
	{ value: "rateLimit", label: "Rate limit" },
];

const PER_ACCOUNT_LABEL: Record<LimitKind, string> = {
	budget: "One cap for each account under it",
	rateLimit: "One count for each account under it",
};

function perAccountHint(kind: LimitKind, target: string): string {
	return kind === "budget"
		? `Every account under ${target}, people and agents alike, gets a cap of this amount of its own. Off: one cap they all share.`
		: `Every account under ${target}, people and agents alike, is counted on its own. Off: one count they all share.`;
}

export function LimitStep({ limit }: { limit: AddLimitForm }) {
	const { form, values, errors, target } = limit;
	const nameErrorId = useId();
	const modelsErrorId = useId();
	const perAccount = limit.perAccountOffered && (
		<ToggleSwitch
			value={values.perAccount}
			onChange={(on) => form.setFieldValue("perAccount", on)}
			label={PER_ACCOUNT_LABEL[values.kind]}
			hint={perAccountHint(values.kind, target.label)}
			error={errors.perAccount}
		/>
	);
	return (
		<div className="flex flex-col gap-6">
			<PolicyLine line={limit.caseLine} />
			<div className="divide-y divide-border">
				<FormSection
					icon={Gauge}
					title="Limit"
					description={`A spend cap stops ${target.label} at an amount of money per period; a rate limit, at a number of requests or tokens per window.`}
				>
					<div className="flex flex-col gap-6">
						<Segmented
							options={KIND_OPTIONS}
							value={values.kind}
							onChange={(kind) => form.setFieldValue("kind", kind)}
							className="self-start"
						/>
						{values.kind === "budget" ? (
							<BudgetCapFields
								amountUsd={values.amountUsd}
								period={values.period}
								mode={values.mode}
								onAmountChange={limit.setAmountUsd}
								onPeriodChange={(p) => form.setFieldValue("period", p)}
								onModeChange={(m) => form.setFieldValue("mode", m)}
								amountError={errors.amountUsd}
							/>
						) : (
							<RateLimitFields
								amount={values.rateAmount}
								meter={values.meter}
								per={values.per}
								onAmountChange={(v) => form.setFieldValue("rateAmount", v)}
								onMeterChange={(m) => form.setFieldValue("meter", m)}
								onPerChange={(p) => form.setFieldValue("per", p)}
								amountError={errors.rateAmount}
							/>
						)}
						{perAccount}
					</div>
				</FormSection>

				{values.kind === "rateLimit" && (
					<FormSection
						icon={Boxes}
						title="Models"
						description="Providers or single models the limit counts. Leave it empty to count every model."
					>
						<fieldset
							aria-label="Models counted"
							aria-describedby={errors.models ? modelsErrorId : undefined}
							className="min-w-0"
						>
							<ModelPicker
								value={values.models}
								onChange={(next) => form.setFieldValue("models", next)}
								emptyText="Every model counts. Pick providers or models to count only those."
							/>
						</fieldset>
						<FieldError id={modelsErrorId} message={errors.models} />
					</FormSection>
				)}

				<FormSection
					icon={Tag}
					title="Name"
					description="Leave it empty to name the limit after its target."
				>
					<Input
						type="text"
						className="w-full"
						value={values.displayName}
						onChange={(e) =>
							form.setFieldValue("displayName", e.currentTarget.value)
						}
						placeholder={limit.namePlaceholder}
						aria-label="Limit name"
						aria-invalid={errors.displayName ? true : undefined}
						aria-describedby={errors.displayName ? nameErrorId : undefined}
					/>
					<FieldError id={nameErrorId} message={errors.displayName} />
				</FormSection>
			</div>
		</div>
	);
}

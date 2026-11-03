import { Boxes, Gauge, Layers, type LucideIcon, Wallet } from "lucide-react";
import type { Policy } from "@/api/types/policy";
import { ModelPicker } from "@/models/ModelPicker";
import { PolicyLinkPicker } from "@/policies/PolicyLinkPicker";
import { PolicyRLPicker } from "@/policies/PolicyRLPicker";
import { budgetLinkShared } from "@/policies/policyFormSpec";
import { SharedLinkSwitch } from "@/policies/SharedLinkSwitch";
import { usePolicyForm } from "@/policies/usePolicyForm";
import {
	useBudgetChoices,
	usePoolChoices,
} from "@/policies/usePolicyLinkChoices";
import { FormFooter } from "@/shared/FormFooter";
import { IdentitySection } from "@/shared/IdentitySection";

interface PolicyFormProps {
	policy?: Policy;
	onSaved: () => void;
	onCancel: () => void;
}

export function PolicyForm({ policy, onSaved, onCancel }: PolicyFormProps) {
	const {
		form,
		values,
		setBudgetIds,
		setBudgetShared,
		isEdit,
		slugPreview,
		displayNameError,
		descriptionError,
		placement,
		usableBy,
	} = usePolicyForm({
		open: true,
		policy,
		onSaved,
	});

	const pools = usePoolChoices(values.poolIds, usableBy);
	const budgets = useBudgetChoices(
		values.budgets.map((b) => b.budgetId),
		usableBy,
	);

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
					displayNameError={displayNameError}
					descriptionError={descriptionError}
					autoFocus={!isEdit}
					placeholder="Default policy"
					placement={placement}
				/>

				<Section
					icon={Boxes}
					title="Models"
					description="Providers or single models this policy allows; a provider includes models added to it later. Hosts come from the pools."
				>
					<ModelPicker
						value={values.models}
						onChange={(next) => form.setFieldValue("models", next)}
						emptyText="All available models: whatever this policy's pools serve. Pick providers or models to narrow it."
					/>
				</Section>

				<Section
					icon={Layers}
					title="Pools"
					description="Pools requests draw host keys from, tried in order: a later pool is the failover for an earlier one. Only for policies bound to a team, project, user or service account."
				>
					<PolicyLinkPicker
						choices={pools}
						onChange={(next) => form.setFieldValue("poolIds", next)}
						ordered
						addLabel="Add pool"
						emptyText="No pools linked."
					/>
				</Section>

				<Section
					icon={Gauge}
					title="Rate limits"
					description="Every linked rate limit applies; a model scope narrows one to those models. Shared is one count for the bound account; off is one count per member under it."
				>
					<PolicyRLPicker
						links={values.rateLimits}
						allowedModels={values.models}
						onChange={(next) => form.setFieldValue("rateLimits", next)}
						usableBy={usableBy}
					/>
				</Section>

				<Section
					icon={Wallet}
					title="Budgets"
					description="Spend caps every request under this policy must fit. Unpriced models are refused under a budget. Shared is one budget for the bound account; off is one budget per member under it."
				>
					<PolicyLinkPicker
						choices={budgets}
						onChange={setBudgetIds}
						renderRowControl={(c) => (
							<SharedLinkSwitch
								value={budgetLinkShared(values.budgets, c.id)}
								onChange={(next) => setBudgetShared(c.id, next)}
								linkLabel={c.label}
							/>
						)}
						addLabel="Add budget"
						emptyText="No budgets linked."
					/>
				</Section>
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

interface SectionProps {
	icon: LucideIcon;
	title: string;
	description: string;
	children: React.ReactNode;
}

function Section({ icon: Icon, title, description, children }: SectionProps) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4 md:gap-8 py-8 first:pt-0 last:pb-0">
			<div className="md:pt-0.5">
				<div className="flex items-center gap-2">
					<Icon
						className="w-3.5 h-3.5 text-muted-foreground shrink-0"
						aria-hidden="true"
					/>
					<h2 className="text-sm font-semibold text-foreground">{title}</h2>
				</div>
				<p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
					{description}
				</p>
			</div>
			<div className="min-w-0">{children}</div>
		</div>
	);
}

import { Boxes, Gauge, Wallet, Waypoints } from "lucide-react";
import type { Policy } from "@/api/types/policy";
import { ModelPicker } from "@/models/ModelPicker";
import { DraftReachNotes } from "@/policies/DraftReachNotes";
import { PolicyLinkPicker } from "@/policies/PolicyLinkPicker";
import { PolicyReachPicker } from "@/policies/PolicyReachPicker";
import { PolicyRLPicker } from "@/policies/PolicyRLPicker";
import { budgetLinkShared } from "@/policies/policyFormSpec";
import { SharedLinkSwitch } from "@/policies/SharedLinkSwitch";
import { UnpricedUnderBudget } from "@/policies/UnpricedUnderBudget";
import { useDraftReach } from "@/policies/useDraftReach";
import { usePolicyForm } from "@/policies/usePolicyForm";
import {
	useBudgetChoices,
	usePoolChoices,
} from "@/policies/usePolicyLinkChoices";
import { FormFooter } from "@/shared/FormFooter";
import { FormSection } from "@/shared/FormSection";
import { IdentitySection } from "@/shared/IdentitySection";
import { ScopedPicker } from "@/shared/ScopeNotes";

interface PolicyFormProps {
	policy?: Policy;
	onSaved: () => void;
	onCancel: () => void;
}

export function PolicyForm({ policy, onSaved, onCancel }: PolicyFormProps) {
	const {
		form,
		values,
		setReach,
		setBudgetIds,
		setBudgetShared,
		isEdit,
		slugPreview,
		displayNameError,
		descriptionError,
		reachError,
		poolsError,
		placement,
		usableBy,
		updatingFor,
		unavailable,
		unavailableErrors,
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
	const reach = useDraftReach({
		owner: usableBy,
		choice: values.reach,
		poolIds: values.poolIds,
		entries: values.models,
	});

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

				<FormSection
					icon={Waypoints}
					title="Reach"
					description="Which credentials requests under this policy may use. Pools are tried in order: a later pool is the failover for an earlier one, and apply only to policies bound to a team, project, user or service account."
				>
					<PolicyReachPicker
						value={values.reach}
						onChange={setReach}
						error={reachError}
					>
						<ScopedPicker updatingFor={updatingFor.pools} error={poolsError}>
							<PolicyLinkPicker
								choices={pools}
								onChange={(next) => form.setFieldValue("poolIds", next)}
								ordered
								addLabel="Add pool"
								emptyText="No pools linked."
								unavailable={unavailable.pools}
							/>
						</ScopedPicker>
					</PolicyReachPicker>
				</FormSection>

				<FormSection
					icon={Boxes}
					title="Models"
					description="Providers or single models this policy allows; a provider includes models added to it later. The list shows what the reach serves."
				>
					<ModelPicker
						value={values.models}
						onChange={(next) => form.setFieldValue("models", next)}
						emptyText="All available models: whatever this policy's reach serves. Pick providers or models to narrow it."
						reach={reach.pickerReach}
						refWarnings={reach.warnings}
					/>
					<DraftReachNotes note={reach.note} excluded={reach.excluded} />
				</FormSection>

				<FormSection
					icon={Gauge}
					title="Rate limits"
					description="Every linked rate limit applies; a model scope narrows one to those models. Shared is one count for the bound account; off is one count per member under it."
				>
					<ScopedPicker
						updatingFor={updatingFor.rateLimits}
						error={unavailableErrors.rateLimits}
					>
						<PolicyRLPicker
							links={values.rateLimits}
							allowedModels={values.models}
							onChange={(next) => form.setFieldValue("rateLimits", next)}
							usableBy={usableBy}
							unavailable={unavailable.rateLimits}
						/>
					</ScopedPicker>
				</FormSection>

				<FormSection
					icon={Wallet}
					title="Budgets"
					description="Spend caps every request under this policy must fit. Unpriced models are refused under a budget. Shared is one budget for the bound account; off is one budget per member under it."
				>
					<ScopedPicker
						updatingFor={updatingFor.budgets}
						error={unavailableErrors.budgets}
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
							unavailable={unavailable.budgets}
						/>
					</ScopedPicker>
					<div className="mt-3 empty:hidden">
						<UnpricedUnderBudget
							policyRef={policy?.metadata.name}
							budgetIds={values.budgets.map((b) => b.budgetId)}
						/>
					</div>
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

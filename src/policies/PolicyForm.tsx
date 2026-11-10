import { Boxes, Gauge, Layers, Users, Wallet } from "lucide-react";
import type { Policy } from "@/api/types/policy";
import { ModelPicker } from "@/models/ModelPicker";
import { DraftReachNotes } from "@/policies/DraftReachNotes";
import { PolicyLinkPicker } from "@/policies/PolicyLinkPicker";
import { PolicyRLPicker } from "@/policies/PolicyRLPicker";
import { budgetLinkShared } from "@/policies/policyFormSpec";
import { SharedLinkSwitch } from "@/policies/SharedLinkSwitch";
import { UnpricedUnderBudget } from "@/policies/UnpricedUnderBudget";
import { useDraftReach } from "@/policies/useDraftReach";
import { usePolicyForm } from "@/policies/usePolicyForm";
import {
	useBudgetChoices,
	usePoolCheckOptions,
} from "@/policies/usePolicyLinkChoices";
import { AccountsPicker } from "@/policy-bindings/AccountsPicker";
import { FormFooter } from "@/shared/FormFooter";
import { FormSection } from "@/shared/FormSection";
import { IdentitySection } from "@/shared/IdentitySection";
import { BoxedCheckList } from "@/shared/MultiSelect";
import { ScopedPicker } from "@/shared/ScopeNotes";
import { ToggleSwitch } from "@/shared/ToggleSwitch";
import { WarningNotes } from "@/shared/WarningNotes";

interface PolicyFormProps {
	policy?: Policy;
	onSaved: (name: string) => void;
	onCancel: () => void;
}

export function PolicyForm({ policy, onSaved, onCancel }: PolicyFormProps) {
	const {
		form,
		values,
		setEveryCredential,
		togglePool,
		setBudgetIds,
		setBudgetShared,
		isEdit,
		slugPreview,
		displayNameError,
		descriptionError,
		poolsError,
		placement,
		usableBy,
		updatingFor,
		unavailable,
		unavailableErrors,
		targets,
	} = usePolicyForm({
		open: true,
		policy,
		onSaved,
	});

	const budgets = useBudgetChoices(
		values.budgets.map((b) => b.budgetId),
		usableBy,
	);
	const reach = useDraftReach({
		owner: usableBy,
		policyId: policy?.metadata.id,
		everyCredential: values.everyCredential,
		poolIds: values.poolIds,
		entries: values.models,
	});
	const poolOptions = usePoolCheckOptions(
		values.poolIds,
		usableBy,
		reach.dropped.byPool,
		unavailable.pools,
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

				<FormSection
					icon={Users}
					title="Applies to"
					description="The teams, projects, service accounts and users whose requests run under this policy. A policy that applies to no one is never used. An account under another policy moves to this one."
				>
					<ScopedPicker updatingFor={targets.updatingFor} error={targets.error}>
						{targets.ready ? (
							<AccountsPicker
								options={targets.options}
								selected={targets.selected}
								onChange={targets.setSelected}
								unavailable={targets.unavailable}
							/>
						) : (
							<p className="text-xs text-muted-foreground">Loading…</p>
						)}
					</ScopedPicker>
				</FormSection>

				<FormSection
					icon={Layers}
					title="Pools"
					description="Which credentials requests under this policy may use. Pools are tried in the order they're ticked: a later pool is the failover for an earlier one. Pools apply only to policies bound to a team, project, user or service account."
				>
					<div className="flex flex-col gap-3">
						<ToggleSwitch
							value={values.everyCredential}
							onChange={setEveryCredential}
							label="Use every credential in scope"
							hint="Requests use the keys this scope owns, then the system's."
						/>
						{!values.everyCredential && (
							<ScopedPicker updatingFor={updatingFor.pools} error={poolsError}>
								<BoxedCheckList
									options={poolOptions}
									selected={values.poolIds}
									onToggle={togglePool}
									emptyLabel="pools"
								/>
							</ScopedPicker>
						)}
						<WarningNotes notes={reach.dropped.other} />
					</div>
				</FormSection>

				<FormSection
					icon={Boxes}
					title="Models"
					description="Providers or single models this policy allows; a provider includes models added to it later. The list shows the models these credentials serve."
				>
					<ModelPicker
						value={values.models}
						onChange={(next) => form.setFieldValue("models", next)}
						emptyText={
							values.everyCredential
								? "All models this scope's credentials serve. Pick providers or models to narrow it."
								: "All models these pools serve. Pick providers or models to narrow it."
						}
						reach={reach.pickerReach}
						refWarnings={reach.warnings}
					/>
					<DraftReachNotes
						note={reach.note}
						accountNote={reach.accountNote}
						excluded={reach.excluded}
					/>
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

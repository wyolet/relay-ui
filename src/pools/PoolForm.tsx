import { Layers, Shuffle } from "lucide-react";
import type { Pool } from "@/api/hooks/pools";
import { HostSelect } from "@/hosts/HostSelect";
import { PoolMemberList } from "@/pools/PoolMemberList";
import { POOL_SELECTIONS, SELECTION_LABELS } from "@/pools/poolKeys";
import { usePoolForm } from "@/pools/usePoolForm";
import { FormFooter } from "@/shared/FormFooter";
import { FormSection } from "@/shared/FormSection";
import { IdentitySection } from "@/shared/IdentitySection";
import { ScopedPicker } from "@/shared/ScopeNotes";
import { Segmented } from "@/shared/Segmented";

const SELECTION_OPTIONS = POOL_SELECTIONS.map((s) => ({
	value: s,
	label: SELECTION_LABELS[s].label,
}));

interface PoolFormProps {
	pool?: Pool;
	onSaved: (savedName: string) => void;
	onCancel: () => void;
}

export function PoolForm({ pool, onSaved, onCancel }: PoolFormProps) {
	const {
		form,
		values,
		errors,
		isEdit,
		slugPreview,
		placement,
		updatingFor,
		unavailableAccounts,
		unavailableKeys,
		membersError,
		hostOptions,
		chosenAccounts,
		availableAccounts,
		chosenKeys,
		availableKeys,
		setHost,
		setSelection,
		accountEdits,
		keyEdits,
	} = usePoolForm({ pool, onSaved });

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
					placeholder="OpenAI production pool"
					placement={placement}
				/>

				<FormSection
					icon={Layers}
					title="Members"
					description="Accounts and credentials at one host, tried in order: accounts first, each with every key it holds, then single credentials."
				>
					<div className="flex flex-col gap-4">
						<HostSelect
							value={values.hostId}
							options={hostOptions}
							onChange={setHost}
							error={errors.hostId}
							disabled={isEdit}
							hint={
								isEdit
									? "Fixed once created: every key in the pool is at this host."
									: undefined
							}
						/>
						{values.hostId && (
							<ScopedPicker updatingFor={updatingFor} error={membersError}>
								<PoolMemberList
									accounts={chosenAccounts}
									keys={chosenKeys}
									availableAccounts={availableAccounts}
									availableKeys={availableKeys}
									accountEdits={accountEdits}
									keyEdits={keyEdits}
									unavailableAccounts={unavailableAccounts}
									unavailableKeys={unavailableKeys}
								/>
							</ScopedPicker>
						)}
					</div>
				</FormSection>

				<FormSection
					icon={Shuffle}
					title="Selection"
					description="How a request picks among the members."
				>
					<Segmented
						options={SELECTION_OPTIONS}
						value={values.selection}
						onChange={setSelection}
					/>
					<p className="mt-1.5 text-[11px] text-muted-foreground">
						{SELECTION_LABELS[values.selection].hint}
					</p>
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

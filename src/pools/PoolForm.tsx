import { Layers } from "lucide-react";
import type { Pool } from "@/api/hooks/pools";
import { HostSelect } from "@/hosts/HostSelect";
import { PoolMemberPicker } from "@/pools/PoolMemberPicker";
import { POOL_SELECTIONS, SELECTION_LABELS } from "@/pools/poolKeys";
import { usePoolForm } from "@/pools/usePoolForm";
import { FormFooter } from "@/shared/FormFooter";
import { FormSection } from "@/shared/FormSection";
import { IdentitySection } from "@/shared/IdentitySection";
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
					title="Keys"
					description="Accounts and credentials at one host that a policy linking this pool routes through, and how a request picks one."
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

						<div>
							<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
								Selection
							</div>
							<Segmented
								options={SELECTION_OPTIONS}
								value={values.selection}
								onChange={setSelection}
							/>
							<p className="mt-1.5 text-[11px] text-muted-foreground">
								{SELECTION_LABELS[values.selection].hint}
							</p>
						</div>

						{values.hostId && (
							<>
								<p className="text-[11px] text-muted-foreground">
									Accounts are tried first, in this order, each with all of its
									keys; then the single keys below.
								</p>
								<PoolMemberPicker
									chosenTitle="Accounts in the pool · in order"
									availableTitle="Provider accounts at this host"
									emptyChosen="No accounts yet. An account brings every key it holds, now and later."
									emptyAvailable="No other provider accounts at this host, own or shared."
									chosen={chosenAccounts}
									available={availableAccounts}
									onAdd={accountEdits.add}
									onRemove={accountEdits.remove}
									onMove={accountEdits.move}
								/>
								<PoolMemberPicker
									chosenTitle="Keys in the pool · in order"
									availableTitle="Credentials at this host"
									emptyChosen="No single keys yet. A pool may stay empty; add credentials below."
									emptyAvailable="No other credentials at this host."
									chosen={chosenKeys}
									available={availableKeys}
									onAdd={keyEdits.add}
									onRemove={keyEdits.remove}
									onMove={keyEdits.move}
								/>
							</>
						)}
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

import { ArrowDown, ArrowUp, Layers, Plus, X } from "lucide-react";
import type { Pool } from "@/api/hooks/pools";
import { IconButton } from "@/components/ui/icon-button";
import { HostSelect } from "@/hosts/HostSelect";
import { POOL_SELECTIONS, SELECTION_LABELS } from "@/pools/poolKeys";
import { type PoolKeyOption, usePoolForm } from "@/pools/usePoolForm";
import { FormFooter } from "@/shared/FormFooter";
import { FormSection } from "@/shared/FormSection";
import { IdentitySection } from "@/shared/IdentitySection";
import { OptionRow } from "@/shared/OptionRow";
import { OwnerSection } from "@/shared/OwnerSection";
import { Segmented } from "@/shared/Segmented";
import { StatusInline } from "@/shared/StatusBadge";

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
		ownerOptions,
		hostOptions,
		chosenKeys,
		availableKeys,
		setHost,
		setSelection,
		addKey,
		removeKey,
		moveKey,
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
				/>

				<OwnerSection
					options={ownerOptions}
					value={values.owner}
					onChange={(v) => form.setFieldValue("owner", v)}
					error={errors.owner}
				/>

				<FormSection
					icon={Layers}
					title="Keys"
					description="Credentials at one host that a policy linking this pool routes through, and how a request picks one."
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
							<KeyPicker
								chosen={chosenKeys}
								available={availableKeys}
								onAdd={addKey}
								onRemove={removeKey}
								onMove={moveKey}
							/>
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

function KeyPicker({
	chosen,
	available,
	onAdd,
	onRemove,
	onMove,
}: {
	chosen: readonly PoolKeyOption[];
	available: readonly PoolKeyOption[];
	onAdd: (id: string) => void;
	onRemove: (id: string) => void;
	onMove: (index: number, delta: -1 | 1) => void;
}) {
	return (
		<div className="flex flex-col gap-3 max-w-xl">
			<div>
				<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
					In the pool · in order
				</div>
				{chosen.length === 0 ? (
					<p className="rounded-md border border-dashed border-border px-3 py-3 text-[11px] text-muted-foreground">
						No keys yet. A pool may stay empty; add credentials below.
					</p>
				) : (
					<ol className="rounded-md border border-border divide-y divide-border">
						{chosen.map((k, i) => (
							<li key={k.id} className="flex items-center gap-2 px-3 py-1.5">
								<span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
									{i + 1}
								</span>
								<KeyLabel option={k} />
								<IconButton
									icon={ArrowUp}
									label={`Move ${k.label} up`}
									disabled={i === 0}
									onClick={() => onMove(i, -1)}
								/>
								<IconButton
									icon={ArrowDown}
									label={`Move ${k.label} down`}
									disabled={i === chosen.length - 1}
									onClick={() => onMove(i, 1)}
								/>
								<IconButton
									icon={X}
									label={`Remove ${k.label}`}
									onClick={() => onRemove(k.id)}
								/>
							</li>
						))}
					</ol>
				)}
			</div>
			<div>
				<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
					Credentials at this host
				</div>
				{available.length === 0 ? (
					<p className="text-[11px] text-muted-foreground">
						No other credentials at this host.
					</p>
				) : (
					<div className="rounded-md border border-border divide-y divide-border overflow-hidden">
						{available.map((k) => (
							<OptionRow key={k.id} onClick={() => onAdd(k.id)}>
								<Plus
									className="size-3.5 shrink-0 text-muted-foreground"
									aria-hidden
								/>
								<KeyLabel option={k} />
							</OptionRow>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

function KeyLabel({ option }: { option: PoolKeyOption }) {
	return (
		<span className="flex min-w-0 flex-1 items-baseline gap-2">
			<span className="truncate text-sm text-foreground">{option.label}</span>
			{option.label !== option.name && (
				<span className="truncate font-mono text-[11px] text-muted-foreground">
					{option.name}
				</span>
			)}
			{!option.enabled && <StatusInline enabled={false} />}
		</span>
	);
}

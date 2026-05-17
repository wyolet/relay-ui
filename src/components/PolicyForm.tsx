import {
	Boxes,
	Gauge,
	KeyRound,
	type LucideIcon,
	ShieldCheck,
	ToggleLeft,
} from "lucide-react";
import { useMemo } from "react";
import { useHostKeys } from "@/api/hooks/hostkeys";
import type { Policy } from "@/api/types/policy";
import { EnabledField } from "@/components/EnabledField";
import { IdentitySection } from "@/components/IdentitySection";
import { PolicyAttachedRelayKeys } from "@/components/PolicyAttachedRelayKeys";
import { PolicyHostRequirements } from "@/components/PolicyHostRequirements";
import { usePolicyHostRequirements } from "@/components/usePolicyHostRequirements";
import { analyzePolicy } from "@/diagnostics/analyzers/policy";
import { DiagnosticList } from "@/diagnostics/DiagnosticList";
import { useDiagnosticGraph } from "@/diagnostics/useDiagnostics";
import { IncludeDeprecatedSwitch } from "@/components/IncludeDeprecatedSwitch";
import { ModelPicker } from "@/components/ModelPicker";
import { MultiSelect } from "@/components/MultiSelect";
import { PolicyRLPicker } from "@/components/PolicyRLPicker";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { displayLabel } from "@/lib/displayLabel";
import { policyFromFormValues, usePolicyForm } from "@/components/usePolicyForm";
import {
	KEY_SELECTION_OPTIONS,
	KEY_SELECTION_VALUES,
	type KeySelection,
} from "@/config/policy";

interface PolicyFormProps {
	policy?: Policy;
	onSaved: () => void;
	onCancel: () => void;
}

export function PolicyForm({ policy, onSaved, onCancel }: PolicyFormProps) {
	const { data: hostKeysData } = useHostKeys();

	const {
		form,
		values,
		isEdit,
		slugPreview,
		displayNameError,
		descriptionError,
	} = usePolicyForm({
		open: true,
		policy,
		onSaved,
	});

	const allHostKeys = hostKeysData.items ?? [];

	const hostKeyOptions = allHostKeys.map((hk) => ({
		value: hk.metadata.id ?? "",
		label: displayLabel(hk.metadata),
	}));

	// Live diagnostics: synthesize a draft policy from form values and run
	// the analyzer against it. Updates on every field change so warnings
	// disappear as soon as the user fixes them — no Save round-trip needed.
	const hostRequirements = usePolicyHostRequirements(
		values.models,
		values.hostKeyIds,
		values.includeDeprecated,
	);

	const graph = useDiagnosticGraph();
	const draftDiagnostics = useMemo(
		() => analyzePolicy(policyFromFormValues(policy, values), graph),
		[policy, values, graph],
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
			{draftDiagnostics.length > 0 && (
				<div className="mb-4">
					<DiagnosticList diagnostics={draftDiagnostics} />
				</div>
			)}
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
				/>

				<Section
					icon={ToggleLeft}
					title="Availability"
					description="Disable to make this policy inert without deleting it."
				>
					<EnabledField
						value={values.enabled}
						onChange={(v) => form.setFieldValue("enabled", v)}
						hint="When off, relay keys attached to this policy reject requests with 401."
					/>
				</Section>

				<Section
					icon={Boxes}
					title="Allowed catalog"
					description="Grant providers, models, hosts, or specific model+host pairs. Wildcard grants auto-include catalog rows added later."
				>
					<div className="flex flex-col gap-2">
						<ModelPicker
							value={values.models}
							onChange={(next) => form.setFieldValue("models", next)}
							includeDeprecated={values.includeDeprecated}
						/>
						<IncludeDeprecatedSwitch
							value={values.includeDeprecated}
							onChange={(next) =>
								form.setFieldValue("includeDeprecated", next)
							}
						/>
					</div>
				</Section>

				<Section
					icon={KeyRound}
					title="Host keys"
					description="Credentials Relay rotates through when calls hit this policy."
				>
					<PolicyHostRequirements
						requirements={hostRequirements}
						selectedHostKeyIds={values.hostKeyIds}
						onChange={(next) => form.setFieldValue("hostKeyIds", next)}
					/>

					<div className="mt-4">
						<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
							Additional keys
						</div>
						<p className="mb-2 text-[11px] text-muted-foreground">
							Attach extra keys beyond what your catalog selection requires.
							Order is preserved — Relay tries them top-to-bottom on rate-limit
							errors.
						</p>
						<MultiSelect
							options={hostKeyOptions}
							selected={values.hostKeyIds}
							onChange={(next) => form.setFieldValue("hostKeyIds", next)}
							placeholder="Attach host keys…"
							emptyHint="No host keys defined."
							aria-label="Host keys"
						/>
					</div>

					<div className="mt-4">
						<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
							Selection strategy
						</div>
						<Select
							value={values.keySelection}
							onValueChange={(v) =>
								form.setFieldValue("keySelection", v as KeySelection)
							}
						>
							<SelectTrigger className="w-full max-w-md">
								<SelectValue>
									{KEY_SELECTION_OPTIONS[values.keySelection].label}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{KEY_SELECTION_VALUES.map((k) => (
									<SelectItem key={k} value={k}>
										<span className="flex flex-col items-start gap-0.5 whitespace-normal">
											<span className="text-sm text-foreground">
												{KEY_SELECTION_OPTIONS[k].label}
											</span>
											<span className="text-[11px] leading-snug text-muted-foreground">
												{KEY_SELECTION_OPTIONS[k].hint}
											</span>
										</span>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<p className="mt-1.5 text-[11px] text-muted-foreground">
							{KEY_SELECTION_OPTIONS[values.keySelection].hint}
						</p>
					</div>
				</Section>

				<Section
					icon={Gauge}
					title="Rate limits"
					description="Attach one or more rate limits and pick which models each governs."
				>
					<PolicyRLPicker
						bindings={values.rlBindings}
						allowedModels={values.models}
						includeDeprecated={values.includeDeprecated}
						onChange={(next) => form.setFieldValue("rlBindings", next)}
					/>
				</Section>

				{policy && (
					<Section
						icon={ShieldCheck}
						title="Relay keys"
						description="Relay keys that resolve to this policy. Use Reassign to move a key to a different policy."
					>
						<PolicyAttachedRelayKeys policy={policy} />
					</Section>
				)}
			</div>

			<div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border mt-6 -mx-6 px-6 py-3 flex items-center justify-end gap-2">
				<button
					type="button"
					onClick={onCancel}
					className="h-8 px-3 rounded-md text-xs font-medium text-foreground hover:bg-muted"
				>
					Cancel
				</button>
				<form.Subscribe selector={(s) => s.isSubmitting}>
					{(isSubmitting) => (
						<button
							type="submit"
							disabled={isSubmitting}
							className="h-8 px-3 rounded-md bg-primary hover:bg-primary/90 text-xs font-semibold text-primary-foreground disabled:opacity-50"
						>
							{isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Create"}
						</button>
					)}
				</form.Subscribe>
			</div>
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

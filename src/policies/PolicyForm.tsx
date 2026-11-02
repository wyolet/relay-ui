import {
	Boxes,
	Gauge,
	Layers,
	type LucideIcon,
	ScrollText,
	Wallet,
} from "lucide-react";
import { useMemo } from "react";
import type { Policy } from "@/api/types/policy";
import { Button } from "@/components/ui/button";
import { analyzePolicy } from "@/diagnostics/analyzers/policy";
import { DiagnosticList } from "@/diagnostics/DiagnosticList";
import { useDiagnosticGraph } from "@/diagnostics/useDiagnostics";
import { ModelPicker } from "@/models/ModelPicker";
import { IncludeDeprecatedSwitch } from "@/policies/IncludeDeprecatedSwitch";
import { PolicyLinkPicker } from "@/policies/PolicyLinkPicker";
import { PolicyRLPicker } from "@/policies/PolicyRLPicker";
import { policyFromFormValues, usePolicyForm } from "@/policies/usePolicyForm";
import {
	useBudgetChoices,
	usePoolChoices,
} from "@/policies/usePolicyLinkChoices";
import { IdentitySection } from "@/shared/IdentitySection";
import { OwnerSection } from "@/shared/OwnerSection";
import { ToggleSwitch } from "@/shared/ToggleSwitch";

interface PolicyFormProps {
	policy?: Policy;
	onSaved: () => void;
	onCancel: () => void;
}

export function PolicyForm({ policy, onSaved, onCancel }: PolicyFormProps) {
	const {
		form,
		values,
		isEdit,
		slugPreview,
		displayNameError,
		descriptionError,
		ownerOptions,
		ownerError,
	} = usePolicyForm({
		open: true,
		policy,
		onSaved,
	});

	const pools = usePoolChoices(values.poolIds);
	const budgets = useBudgetChoices(values.budgetIds);

	// Live diagnostics: synthesize a draft policy from form values and run
	// the analyzer against it, so warnings clear without a Save round-trip.
	const graph = useDiagnosticGraph();
	const draftDiagnostics = useMemo(
		() =>
			graph ? analyzePolicy(policyFromFormValues(policy, values), graph) : [],
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

				<OwnerSection
					options={ownerOptions}
					value={values.owner}
					onChange={(v) => form.setFieldValue("owner", v)}
					error={ownerError}
				/>

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
							onChange={(next) => form.setFieldValue("includeDeprecated", next)}
						/>
					</div>
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
					icon={ScrollText}
					title="Logging"
					description="Capture full request and response bodies for traffic under this policy."
				>
					<ToggleSwitch
						value={values.payloadLoggingEnabled}
						onChange={(v) => form.setFieldValue("payloadLoggingEnabled", v)}
						label="Capture request & response payloads"
						hint="Logs bodies for this policy's traffic (visible under Logs), overriding the per-key setting. A global default can override this in turn."
					/>
				</Section>

				<Section
					icon={Gauge}
					title="Rate limits"
					description="Every linked rate limit applies; a model scope narrows one to those models."
				>
					<PolicyRLPicker
						links={values.rateLimits}
						allowedModels={values.models}
						includeDeprecated={values.includeDeprecated}
						onChange={(next) => form.setFieldValue("rateLimits", next)}
					/>
				</Section>

				<Section
					icon={Wallet}
					title="Budgets"
					description="Spend caps every request under this policy must fit. Unpriced models are refused under a budget."
				>
					<PolicyLinkPicker
						choices={budgets}
						onChange={(next) => form.setFieldValue("budgetIds", next)}
						addLabel="Add budget"
						emptyText="No budgets linked."
					/>
				</Section>
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

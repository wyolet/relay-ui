import { ShieldCheck, ToggleLeft } from "lucide-react";
import { usePolicies } from "@/api/hooks/policies";
import type { RelayKey } from "@/api/types/relayKey";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { displayLabel } from "@/lib/displayLabel";
import { useRelayKeyForm } from "@/relay-keys/useRelayKeyForm";
import { FormSection } from "@/shared/FormSection";
import { IdentitySection } from "@/shared/IdentitySection";
import { ToggleSwitch } from "@/shared/ToggleSwitch";

interface RelayKeyFormProps {
	relayKey?: RelayKey;
	onSaved: (savedName: string) => void;
	onCreated?: (plaintext: string) => void;
	onCancel: () => void;
}

export function RelayKeyForm({
	relayKey,
	onSaved,
	onCreated,
	onCancel,
}: RelayKeyFormProps) {
	const {
		form,
		values,
		isEdit,
		slugPreview,
		displayNameError,
		descriptionError,
		policyIdError,
	} = useRelayKeyForm({ open: true, relayKey, onSaved, onCreated });

	const { data: policiesData } = usePolicies();
	const policyOptions = (policiesData.items ?? []).map((p) => ({
		value: p.metadata.id ?? "",
		label: displayLabel(p.metadata),
	}));

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
					placeholder="prod-app"
				/>

				<FormSection
					icon={ShieldCheck}
					title="Policy"
					description="Which policy authorizes requests made with this key — controls allowed models, hosts, and rate limits."
				>
					<div>
						<Select
							value={values.policyId}
							items={policyOptions}
							onValueChange={(v) => form.setFieldValue("policyId", v ?? "")}
						>
							<SelectTrigger
								className="w-full max-w-md"
								aria-invalid={policyIdError ? true : undefined}
							>
								<SelectValue placeholder="Pick a policy…" />
							</SelectTrigger>
							<SelectContent>
								{policyOptions.map((p) => (
									<SelectItem key={p.value} value={p.value}>
										{p.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{policyIdError && (
							<p className="mt-1.5 text-[11px] text-destructive">
								{policyIdError}
							</p>
						)}
					</div>
				</FormSection>

				<FormSection
					icon={ToggleLeft}
					title="Behavior"
					description="Operational flags applied at request time."
				>
					<ToggleSwitch
						value={values.passthroughAllowed}
						onChange={(v) => form.setFieldValue("passthroughAllowed", v)}
						label="Allow upstream passthrough"
						hint="Permits the caller to forward their own provider API key instead of using the policy's credentials."
					/>
					<ToggleSwitch
						value={values.payloadLoggingEnabled}
						onChange={(v) => form.setFieldValue("payloadLoggingEnabled", v)}
						label="Capture request & response payloads"
						hint="Logs full request/response bodies for this key's traffic (visible under Logs). The policy or a global default can override this."
					/>
				</FormSection>
			</div>

			<div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border mt-6 -mx-6 px-6 py-3 flex items-center justify-end gap-2">
				<Button type="button" variant="ghost" onClick={onCancel}>
					Cancel
				</Button>
				<form.Subscribe selector={(s) => s.isSubmitting}>
					{(isSubmitting) => (
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Create"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}

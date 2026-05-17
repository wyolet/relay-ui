import { ShieldCheck, ToggleLeft } from "lucide-react";
import { usePolicies } from "@/api/hooks/policies";
import type { RelayKey } from "@/api/types/relayKey";
import { FormSection } from "@/shared/FormSection";
import { IdentitySection } from "@/shared/IdentitySection";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useRelayKeyForm } from "@/components/useRelayKeyForm";
import { displayLabel } from "@/lib/displayLabel";

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
							value={values.policyId || undefined}
							onValueChange={(v) => form.setFieldValue("policyId", v ?? "")}
						>
							<SelectTrigger
								className="w-full max-w-md"
								aria-invalid={policyIdError ? true : undefined}
							>
								<SelectValue placeholder="Pick a policy…">
									{
										policyOptions.find((p) => p.value === values.policyId)
											?.label
									}
								</SelectValue>
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
					<div className="flex flex-col gap-3">
						<label className="flex items-start gap-3 cursor-pointer">
							<input
								type="checkbox"
								checked={values.enabled}
								onChange={(e) =>
									form.setFieldValue("enabled", e.currentTarget.checked)
								}
								className="mt-0.5 h-3.5 w-3.5 accent-primary"
							/>
							<span className="flex flex-col gap-0.5">
								<span className="text-sm text-foreground">Enabled</span>
								<span className="text-[11px] text-muted-foreground leading-snug">
									When off, requests with this key return 401. Re-enable any
									time without rotating the secret.
								</span>
							</span>
						</label>
						<label className="flex items-start gap-3 cursor-pointer">
							<input
								type="checkbox"
								checked={values.passthroughAllowed}
								onChange={(e) =>
									form.setFieldValue(
										"passthroughAllowed",
										e.currentTarget.checked,
									)
								}
								className="mt-0.5 h-3.5 w-3.5 accent-primary"
							/>
							<span className="flex flex-col gap-0.5">
								<span className="text-sm text-foreground">
									Allow upstream passthrough
								</span>
								<span className="text-[11px] text-muted-foreground leading-snug">
									Permits the caller to forward their own provider API key
									instead of using the policy's host keys.
								</span>
							</span>
						</label>
					</div>
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

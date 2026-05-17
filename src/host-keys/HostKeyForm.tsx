import { Link } from "@tanstack/react-router";
import {
	Globe,
	KeyRound,
	Link2,
	ShieldCheck,
	ToggleLeft,
	Unlink2,
} from "lucide-react";
import type { HostKey, HostKeyKind } from "@/api/types/hostkey";
import { EnabledField } from "@/shared/EnabledField";
import { FormSection } from "@/shared/FormSection";
import { IdentitySection } from "@/shared/IdentitySection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useHostKeyForm } from "@/host-keys/useHostKeyForm";

const KIND_OPTIONS: Record<HostKeyKind, { label: string; hint: string }> = {
	stored: {
		label: "Stored value",
		hint: "Relay encrypts and stores the secret. Use for keys you paste directly into the UI.",
	},
	env: {
		label: "Environment variable",
		hint: "Relay reads the secret from this env var on the deployment at request time.",
	},
};

interface HostKeyFormProps {
	hostKey?: HostKey;
	onSaved: (savedName: string) => void;
	onCancel: () => void;
}

export function HostKeyForm({ hostKey, onSaved, onCancel }: HostKeyFormProps) {
	const {
		form,
		values,
		isEdit,
		slugPreview,
		displayNameError,
		descriptionError,
		hostIdError,
		policyIdError,
		envVarError,
		valueError,
		hostOptions,
		policyOptions,
		hostSelected,
		selectedHostLabel,
		selectedPolicyLabel,
		attachedPolicies,
		detachFromPolicy,
		isDetachPending,
		setHost,
		setPolicy,
	} = useHostKeyForm({ open: true, hostKey, onSaved });

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
					placeholder="OpenAI production key"
				/>

				<FormSection
					icon={ToggleLeft}
					title="Availability"
					description="Disable to make this credential inert without detaching it."
				>
					<EnabledField
						value={values.enabled}
						onChange={(v) => form.setFieldValue("enabled", v)}
						hint="When off, requests routed to this host key fall through to the next eligible credential (or fail if none)."
					/>
				</FormSection>

				<FormSection
					icon={Globe}
					title="Host & host policy"
					description="Which upstream provider this credential authenticates against, and the host policy (mirrors the provider's own tier, e.g. OpenAI Tier 2) that governs its rate limits and capacity."
				>
					<div className="flex flex-col gap-4">
						<div>
							<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
								Host
							</div>
							<Select
								value={values.hostId || undefined}
								onValueChange={(v) => setHost(v ?? "")}
							>
								<SelectTrigger
									className="w-full max-w-md"
									aria-invalid={hostIdError ? true : undefined}
								>
									<SelectValue placeholder="Pick a host…">
										{selectedHostLabel}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{hostOptions.map((h) => (
										<SelectItem key={h.value} value={h.value}>
											{h.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{hostIdError && (
								<p className="mt-1.5 text-[11px] text-destructive">
									{hostIdError}
								</p>
							)}
						</div>
						<div>
							<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1 inline-flex items-center gap-1">
								<ShieldCheck className="w-3 h-3" />
								Host policy
							</div>
							<Select
								value={values.policyId || undefined}
								onValueChange={(v) => setPolicy(v ?? "")}
								disabled={!hostSelected}
							>
								<SelectTrigger
									className="w-full max-w-md"
									aria-invalid={policyIdError ? true : undefined}
								>
									<SelectValue
										placeholder={
											hostSelected
												? policyOptions.length === 0
													? "No host policies defined for this host"
													: "Pick a host policy…"
												: "Pick a host first…"
										}
									>
										{selectedPolicyLabel}
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
							<p className="mt-1.5 text-[11px] text-muted-foreground leading-snug">
								Mirrors the provider's own tier (e.g. <em>OpenAI Tier 2</em>) so
								Relay knows the real ceiling for this key. Distinct from a user
								policy — even if this host key is added to a user policy's pool,
								the host policy chosen here is never overridden, only respected
								as a hard cap.
							</p>
						</div>
					</div>
				</FormSection>

				{!isEdit && (
					<FormSection
						icon={KeyRound}
						title="Source"
						description="Where Relay reads the credential from at request time."
					>
						<div className="flex flex-col gap-4">
							<div>
								<Select
									value={values.kind}
									onValueChange={(v) =>
										form.setFieldValue("kind", v as HostKeyKind)
									}
								>
									<SelectTrigger className="w-full max-w-md">
										<SelectValue>{KIND_OPTIONS[values.kind].label}</SelectValue>
									</SelectTrigger>
									<SelectContent>
										{(Object.keys(KIND_OPTIONS) as HostKeyKind[]).map((k) => (
											<SelectItem key={k} value={k}>
												<span className="flex flex-col items-start gap-0.5 whitespace-normal">
													<span className="text-sm text-foreground">
														{KIND_OPTIONS[k].label}
													</span>
													<span className="text-[11px] leading-snug text-muted-foreground">
														{KIND_OPTIONS[k].hint}
													</span>
												</span>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<p className="mt-1.5 text-[11px] text-muted-foreground">
									{KIND_OPTIONS[values.kind].hint}
								</p>
							</div>

							{values.kind === "env" && (
								<div>
									<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
										Environment variable
									</div>
									<Input
										type="text"
										value={values.envVar}
										onChange={(e) =>
											form.setFieldValue("envVar", e.currentTarget.value)
										}
										placeholder="OPENAI_API_KEY"
										className="font-mono w-full max-w-md"
										aria-invalid={envVarError ? true : undefined}
									/>
									{envVarError && (
										<p className="mt-1.5 text-[11px] text-destructive">
											{envVarError}
										</p>
									)}
									<p className="mt-1.5 text-[11px] text-muted-foreground">
										Set this env var on your relay deployment.
									</p>
								</div>
							)}

							{values.kind === "stored" && (
								<div>
									<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
										Secret value
									</div>
									<Input
										type="password"
										autoComplete="new-password"
										value={values.value}
										onChange={(e) =>
											form.setFieldValue("value", e.currentTarget.value)
										}
										placeholder="sk-…"
										className="w-full max-w-md"
										aria-invalid={valueError ? true : undefined}
									/>
									{valueError && (
										<p className="mt-1.5 text-[11px] text-destructive">
											{valueError}
										</p>
									)}
								</div>
							)}
						</div>
					</FormSection>
				)}

				{isEdit && (
					<FormSection
						icon={Link2}
						title="Attached to user policies"
						description="User policies that include this host key in their pool. Detach from a policy to remove it from rotation."
					>
						{attachedPolicies.length === 0 ? (
							<p className="text-xs text-muted-foreground">
								This host key is not attached to any user policy yet.
							</p>
						) : (
							<ul className="divide-y divide-border">
								{attachedPolicies.map((p) => (
									<li
										key={p.id}
										className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
									>
										<div className="min-w-0 flex flex-col gap-0.5">
											<Link
												to="/policies/$name"
												params={{ name: p.name }}
												className="text-sm font-medium text-foreground hover:text-primary hover:underline truncate"
											>
												{p.label}
											</Link>
											{p.hasDisplayName && (
												<code className="font-mono text-[11px] text-muted-foreground">
													{p.name}
												</code>
											)}
											{p.description && (
												<p className="mt-1 text-[11px] text-muted-foreground leading-snug">
													{p.description}
												</p>
											)}
										</div>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => void detachFromPolicy(p.id)}
											disabled={isDetachPending}
										>
											<Unlink2 className="w-3 h-3" />
											Detach
										</Button>
									</li>
								))}
							</ul>
						)}
					</FormSection>
				)}
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

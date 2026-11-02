import { Link } from "@tanstack/react-router";
import { Building2, Globe, KeyRound, Link2 } from "lucide-react";
import type { Account } from "@/api/hooks/accounts";
import type { HostKey, HostKeyKind } from "@/api/types/hostkey";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { LinkedPolicyAction } from "@/host-keys/LinkedPolicyAction";
import { useHostKeyForm } from "@/host-keys/useHostKeyForm";
import { HostSelect } from "@/hosts/HostSelect";
import { FormFooter } from "@/shared/FormFooter";
import { FormSection } from "@/shared/FormSection";
import { IdentitySection } from "@/shared/IdentitySection";

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
	account?: Account;
	onSaved: (savedName: string) => void;
	onCancel: () => void;
}

export function HostKeyForm({
	hostKey,
	account,
	onSaved,
	onCancel,
}: HostKeyFormProps) {
	const {
		form,
		values,
		isEdit,
		slugPreview,
		displayNameError,
		descriptionError,
		placement,
		hostIdError,
		envVarError,
		envVarReservedPrefix,
		valueError,
		hostOptions,
		accountOptions,
		hostSelected,
		accountLocked,
		attachedPolicies,
		setHost,
		setAccount,
	} = useHostKeyForm({ open: true, hostKey, account, onSaved });

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
					placement={placement}
				/>

				<FormSection
					icon={Globe}
					title="Host & account"
					description="Which upstream provider this credential authenticates against, and the provider account (organization) whose limits it shares."
				>
					<div className="flex flex-col gap-4">
						<HostSelect
							value={values.hostId}
							options={hostOptions}
							onChange={setHost}
							error={hostIdError}
							disabled={accountLocked}
							hint={accountLocked ? "Set by the account." : undefined}
						/>
						<div>
							<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1 inline-flex items-center gap-1">
								<Building2 className="w-3 h-3" />
								Account
							</div>
							<Select
								value={values.accountId}
								items={accountOptions}
								onValueChange={(v) => setAccount(v ?? "")}
								disabled={!hostSelected || accountLocked}
							>
								<SelectTrigger className="w-full max-w-md">
									<SelectValue placeholder="Pick a host first…" />
								</SelectTrigger>
								<SelectContent>
									{accountOptions.map((a) => (
										<SelectItem key={a.value} value={a.value}>
											{a.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<p className="mt-1.5 text-[11px] text-muted-foreground leading-snug">
								A key without an account joins its owner's default account at
								the host. Keys that share one provider organization belong in
								one account.
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
									{!envVarError && envVarReservedPrefix && (
										<p className="mt-1.5 text-[11px] text-warning">
											Names starting with {envVarReservedPrefix} are reserved
											for relay's own configuration, and relay refuses them.
											Pick another name.
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
						title="Linked by policies"
						description="Policies that reach this credential through a pool. Change the link on the pool."
					>
						{attachedPolicies.length === 0 ? (
							<p className="text-xs text-muted-foreground">
								No policy links this credential.
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
										<LinkedPolicyAction row={p} />
									</li>
								))}
							</ul>
						)}
					</FormSection>
				)}
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

import { Link } from "@tanstack/react-router";
import { Building2, KeyRound, Layers, Link2 } from "lucide-react";
import { useState } from "react";
import { NewAccountDialog } from "@/accounts/NewAccountDialog";
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
import { KeyAccountSelect } from "@/host-keys/KeyAccountSelect";
import { LinkedPolicyAction } from "@/host-keys/LinkedPolicyAction";
import { useHostKeyForm } from "@/host-keys/useHostKeyForm";
import { FormFooter } from "@/shared/FormFooter";
import { FormSection } from "@/shared/FormSection";
import { IdentitySection } from "@/shared/IdentitySection";
import { MultiCheckList } from "@/shared/MultiSelect";
import { OptionWithHint } from "@/shared/OptionWithHint";

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
		accountIdError,
		envVarError,
		envVarReservedPrefix,
		valueError,
		accountGroups,
		accountLocked,
		attachedPolicies,
		poolsShown,
		poolOptions,
		checkedPoolIds,
		setKeyAccount,
		selectCreatedAccount,
		togglePool,
	} = useHostKeyForm({ open: true, hostKey, account, onSaved });
	const [newAccountOpen, setNewAccountOpen] = useState(false);

	return (
		<>
			{newAccountOpen && (
				<NewAccountDialog
					presetHostId={values.hostId}
					onClose={() => setNewAccountOpen(false)}
					onCreated={selectCreatedAccount}
				/>
			)}
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
						icon={Building2}
						title="Account"
						description="The provider account (organization) whose limits this credential shares. It sets the host the credential authenticates against."
					>
						<KeyAccountSelect
							groups={accountGroups}
							value={values.accountId}
							onChange={setKeyAccount}
							onNewAccount={() => setNewAccountOpen(true)}
							error={accountIdError}
							locked={accountLocked}
						/>
					</FormSection>

					{!isEdit && (
						<FormSection
							icon={Layers}
							title="Pools"
							description="Optional. Pools at the account's host that draw on this credential; it's appended to each after it's created."
						>
							{poolsShown ? (
								<div className="max-w-md rounded-md border border-border p-2">
									<MultiCheckList
										options={poolOptions}
										selected={checkedPoolIds}
										onToggle={togglePool}
										emptyLabel="pools"
									/>
								</div>
							) : (
								<p className="text-xs text-muted-foreground">
									Pick an account first.
								</p>
							)}
						</FormSection>
					)}

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
											<SelectValue>
												{KIND_OPTIONS[values.kind].label}
											</SelectValue>
										</SelectTrigger>
										<SelectContent>
											{(Object.keys(KIND_OPTIONS) as HostKeyKind[]).map((k) => (
												<SelectItem key={k} value={k}>
													<OptionWithHint
														label={KIND_OPTIONS[k].label}
														hint={KIND_OPTIONS[k].hint}
													/>
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
		</>
	);
}

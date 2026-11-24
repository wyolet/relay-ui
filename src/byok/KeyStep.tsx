import { Building2, Gauge, KeyRound, Tag } from "lucide-react";
import { useId } from "react";
import { NEW_ACCOUNT, type useByokForm } from "@/byok/useByokForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { FieldError } from "@/shared/FieldError";
import { FormSection } from "@/shared/FormSection";
import { SecretInput } from "@/shared/SecretInput";

type ByokForm = ReturnType<typeof useByokForm>;

const NEW_ACCOUNT_OPTION = "new";
const NO_TIER_OPTION = "none";

export function KeyStep({ byok }: { byok: ByokForm }) {
	const { form, values, errors, takenAccount } = byok;
	const secretErrorId = useId();
	const accountErrorId = useId();
	const accountNameErrorId = useId();
	const tierErrorId = useId();
	const keyNameErrorId = useId();
	const hostLabel = byok.host?.label ?? "the provider";
	const accountItems = [
		{ value: NEW_ACCOUNT_OPTION, label: "New account" },
		...byok.accounts.map((a) => ({ value: a.id, label: a.label })),
	];
	const tierItems = [
		{
			value: NO_TIER_OPTION,
			label: byok.newAccount ? "No tier" : "Keep the account's tier",
		},
		...byok.tiers,
	];
	return (
		<div className="divide-y divide-border">
			{!byok.keyless && (
				<FormSection
					icon={KeyRound}
					title="Key"
					description={`The API key from ${hostLabel}. Relay seals it at rest and never shows it again.`}
				>
					<SecretInput
						className="w-full max-w-md"
						value={values.secret}
						onChange={(e) =>
							form.setFieldValue("secret", e.currentTarget.value)
						}
						placeholder="Paste the key"
						aria-label="Key"
						aria-invalid={errors.secret ? true : undefined}
						aria-describedby={errors.secret ? secretErrorId : undefined}
						autoFocus
					/>
					<FieldError id={secretErrorId} message={errors.secret} />
				</FormSection>
			)}

			<FormSection
				icon={Building2}
				title="Account"
				description={
					byok.keyless
						? `${hostLabel} takes no key, so only the account is made.`
						: `Your organization at ${hostLabel}. Keys of one account share its limits there, so a second key of the same organization joins its account.`
				}
			>
				<div className="flex flex-col gap-3">
					<div>
						<Select
							value={byok.newAccount ? NEW_ACCOUNT_OPTION : values.accountId}
							items={accountItems}
							onValueChange={(v) =>
								byok.chooseAccount(
									!v || v === NEW_ACCOUNT_OPTION ? NEW_ACCOUNT : v,
								)
							}
						>
							<SelectTrigger
								className="w-full max-w-md"
								aria-label="Account"
								aria-invalid={errors.accountId ? true : undefined}
								aria-describedby={errors.accountId ? accountErrorId : undefined}
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{accountItems.map((o) => (
									<SelectItem key={o.value} value={o.value}>
										{o.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<FieldError id={accountErrorId} message={errors.accountId} />
						{takenAccount && (
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="mt-2"
								onClick={() => byok.chooseAccount(takenAccount.id)}
							>
								Use {takenAccount.label}
							</Button>
						)}
					</div>
					{byok.newAccount && (
						<div>
							<Input
								type="text"
								className="w-full max-w-md"
								value={values.accountName}
								onChange={(e) =>
									form.setFieldValue("accountName", e.currentTarget.value)
								}
								placeholder={byok.accountNamePlaceholder}
								aria-label="Account name"
								aria-invalid={errors.accountName ? true : undefined}
								aria-describedby={
									errors.accountName ? accountNameErrorId : undefined
								}
							/>
							<FieldError
								id={accountNameErrorId}
								message={errors.accountName}
							/>
						</div>
					)}
				</div>
			</FormSection>

			{byok.tierOffered && (
				<FormSection
					icon={Gauge}
					title="Tier"
					description={`The plan your organization is on at ${hostLabel}. Relay holds the account to that tier's rate limits, so it stops before the provider answers 429.`}
				>
					<Select
						value={values.tierPolicyId || NO_TIER_OPTION}
						items={tierItems}
						onValueChange={(v) =>
							form.setFieldValue(
								"tierPolicyId",
								!v || v === NO_TIER_OPTION ? "" : v,
							)
						}
					>
						<SelectTrigger
							className="w-full max-w-md"
							aria-label="Tier"
							aria-invalid={errors.tierPolicyId ? true : undefined}
							aria-describedby={errors.tierPolicyId ? tierErrorId : undefined}
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{tierItems.map((o) => (
								<SelectItem key={o.value} value={o.value}>
									{o.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<FieldError id={tierErrorId} message={errors.tierPolicyId} />
				</FormSection>
			)}

			{!byok.keyless && (
				<FormSection
					icon={Tag}
					title="Key name"
					description="How the key reads in lists. Leave it empty to name it after the provider."
				>
					<Input
						type="text"
						className="w-full max-w-md"
						value={values.keyName}
						onChange={(e) =>
							form.setFieldValue("keyName", e.currentTarget.value)
						}
						placeholder={byok.keyNamePlaceholder}
						aria-label="Key name"
						aria-invalid={errors.keyName ? true : undefined}
						aria-describedby={errors.keyName ? keyNameErrorId : undefined}
					/>
					<FieldError id={keyNameErrorId} message={errors.keyName} />
				</FormSection>
			)}
		</div>
	);
}

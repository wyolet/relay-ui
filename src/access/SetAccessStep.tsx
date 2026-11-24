import type { AccessTarget } from "@/access/accessTarget";
import type { useSetAccessForm } from "@/access/useSetAccessForm";
import {
	AccessFields,
	type AccessFieldsText,
	KeylessPoolList,
} from "@/agents/AccessFields";
import { PolicyLine } from "@/policy-bindings/PolicyLine";
import { ToggleSwitch } from "@/shared/ToggleSwitch";

type SetAccessForm = ReturnType<typeof useSetAccessForm>;

function accessText(target: AccessTarget): AccessFieldsText {
	return {
		accountsDescription: `The provider accounts whose keys ${target.label}'s requests may use.`,
		everyCredentialHint: `Requests use the keys ${target.scopeLabel} holds, then the system's.`,
		shareNote: `Shared with ${target.scopeLabel} on save.`,
		modelsDescription: `Providers or single models ${target.label} may call. Leave it empty to allow everything its accounts serve.`,
		everyCredentialModels:
			"All models the credentials in scope serve. Pick providers or models to narrow it.",
	};
}

export function SetAccessStep({ access }: { access: SetAccessForm }) {
	const { form, values, errors, target } = access;
	const listsPools = access.pools.length > 0;
	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-col gap-1.5">
				<PolicyLine line={access.currentLine} />
				{access.hiddenPoolsLine && (
					<p className="text-xs text-muted-foreground">
						{access.hiddenPoolsLine}
					</p>
				)}
				{errors.access && (
					<p role="alert" className="text-[11px] text-destructive">
						{errors.access}
					</p>
				)}
			</div>
			<div className="divide-y divide-border">
				<AccessFields
					text={accessText(target)}
					everyCredential={values.everyCredential}
					onEveryCredentialChange={(on) =>
						form.setFieldValue("everyCredential", on)
					}
					accounts={access.accounts}
					accountsLoaded
					selectedAccountIds={values.accountIds}
					onToggleAccount={access.toggleAccount}
					accountsError={
						errors.accountIds ?? (listsPools ? undefined : errors.poolIds)
					}
					keptPools={
						access.keptPools.length > 0 && (
							<ul
								aria-label="Kept pools"
								className="flex max-w-md flex-col gap-2"
							>
								{access.keptPools.map((p) => (
									<li key={p.id}>
										<ToggleSwitch
											value={values.keptPoolIds.includes(p.id)}
											onChange={() => access.toggleKeptPool(p.id)}
											label={p.label}
											hint={`${p.hint} Kept as it is.`}
										/>
									</li>
								))}
							</ul>
						)
					}
					keylessPools={
						listsPools && (
							<KeylessPoolList
								pools={access.pools}
								selected={values.poolIds}
								onToggle={access.togglePool}
								error={errors.poolIds}
							/>
						)
					}
					models={values.models}
					onModelsChange={(next) => form.setFieldValue("models", next)}
					reach={access.reach}
				/>
			</div>
		</div>
	);
}

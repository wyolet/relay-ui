import { ShieldCheck } from "lucide-react";
import type { AccessTarget } from "@/access/accessTarget";
import type { useSetAccessForm } from "@/access/useSetAccessForm";
import { AccessFields, type AccessFieldsText } from "@/agents/AccessFields";
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

/** What the target is under now, above the fields that replace it. */
export function CurrentPolicyLine({ line }: { line: string }) {
	return (
		<p className="flex items-center gap-2 text-xs text-muted-foreground">
			<ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
			{line}
		</p>
	);
}

export function SetAccessStep({ access }: { access: SetAccessForm }) {
	const { form, values, errors, target } = access;
	return (
		<div className="flex flex-col gap-8">
			<CurrentPolicyLine line={access.currentLine} />
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
					accountsError={errors.accountIds}
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
					models={values.models}
					onModelsChange={(next) => form.setFieldValue("models", next)}
					reach={access.reach}
				/>
			</div>
		</div>
	);
}

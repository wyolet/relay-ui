import type { components } from "@/api/types.gen";

type AccountReceiver = components["schemas"]["AccountReceiver"];

export interface ByokReceiver {
	kind: Extract<AccountReceiver["kind"], "team" | "project">;
	id: string;
	label: string;
}

export interface ByokAnswers {
	hostLabel: string;
	/** An existing account of the owner at the host; "" makes a new one. */
	accountId: string;
	accountName: string;
	keyName: string;
	/** The host tier preset a new account is bound to; "" binds none. */
	tierPolicyId: string;
	receivers: readonly ByokReceiver[];
}

/** One request the form makes after the last step, in order. */
export type ByokWrite = { id: string; label: string } & (
	| { kind: "account"; displayName: string }
	| { kind: "tier"; policyId: string }
	| { kind: "hostKey"; displayName: string }
	| { kind: "detect" }
	| { kind: "share"; receiver: AccountReceiver; receiverLabel: string }
);

/** The requests that store the key, place it in an account and share that account. */
export function byokWrites(answers: ByokAnswers): ByokWrite[] {
	const newAccount = answers.accountId === "";
	const writes: ByokWrite[] = [];
	if (newAccount) {
		writes.push({
			kind: "account",
			id: "account",
			label: `Create the ${answers.hostLabel} account`,
			displayName: answers.accountName,
		});
		if (answers.tierPolicyId) {
			writes.push({
				kind: "tier",
				id: "tier",
				label: "Set the account's tier",
				policyId: answers.tierPolicyId,
			});
		}
	}
	writes.push(
		{
			kind: "hostKey",
			id: "host-key",
			label: "Store the key",
			displayName: answers.keyName,
		},
		{
			kind: "detect",
			id: "detect",
			label: `Ask ${answers.hostLabel} which organization the key belongs to`,
		},
		...answers.receivers.map(
			(r): ByokWrite => ({
				kind: "share",
				id: `share:${r.kind}:${r.id}`,
				label: `Share the account with ${r.label}`,
				receiver: { kind: r.kind, id: r.id },
				receiverLabel: r.label,
			}),
		),
	);
	return writes;
}

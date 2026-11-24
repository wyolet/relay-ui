import type {
	PseudoHostKey,
	PseudoHostKeyCreated,
} from "@/api/hooks/pseudoHostKeys";
import type { components } from "@/api/types.gen";
import { receiverKey } from "@/byok/byokChoices";
import type { ByokReceiver } from "@/byok/byokWrites";
import type { StoredKey } from "@/byok/useByokWrites";
import { type PickedScope, scopeOwner } from "@/lib/ownerPick";

type AccountReceiver = components["schemas"]["AccountReceiver"];

export interface PseudoByokAnswers {
	hostId: string;
	scope: PickedScope;
	/** The host takes no key: no value is sent and no key is made. */
	keyless: boolean;
	secret: string;
	/** An existing account of the owner at the host; "" makes a new one. */
	accountId: string;
	accountName: string;
	keyName: string;
	/** "" leaves the account's tier as it is. */
	tierPolicyId: string;
	receivers: readonly ByokReceiver[];
}

/** The `POST /pseudo-host-keys` body for the form's answers; a personal key sends a user owner without an id, which relay reads as the caller. */
export function pseudoByokBody(answers: PseudoByokAnswers): PseudoHostKey {
	return {
		metadata: {
			...(answers.keyless ? {} : { displayName: answers.keyName }),
			owner: scopeOwner(answers.scope) ?? { kind: "user" },
		},
		spec: {
			hostId: answers.hostId,
			...(answers.keyless ? {} : { value: answers.secret }),
			...(answers.accountId
				? { accountId: answers.accountId }
				: { account: { displayName: answers.accountName } }),
			...(answers.tierPolicyId ? { tierPolicyId: answers.tierPolicyId } : {}),
			...(answers.receivers.length > 0
				? {
						shareWith: answers.receivers.map((r) => ({
							kind: r.kind,
							id: r.id,
						})),
					}
				: {}),
		},
	};
}

export const DETECTION_UNSUPPORTED =
	"The provider can't name an organization for this key.";
export const DETECTION_UNREACHABLE =
	"The provider couldn't be reached to check the key.";

const DETECTION_NOTES: Partial<
	Record<NonNullable<PseudoHostKeyCreated["detection"]>, string>
> = {
	unsupported: DETECTION_UNSUPPORTED,
	unreachable: DETECTION_UNREACHABLE,
};

/** The done screen's data from relay's answer; `receiverLabel` names a team or project the account is shared with. */
export function storedPseudoKey(
	answer: PseudoHostKeyCreated,
	receiverLabel: (receiver: AccountReceiver) => string,
): StoredKey {
	const organization =
		answer.detected?.orgName?.trim() || answer.detected?.orgId;
	const detectionNote = answer.detection && DETECTION_NOTES[answer.detection];
	return {
		...(answer.hostKey ? { hostKeyName: answer.hostKey.name } : {}),
		accountName: answer.account.name,
		accountMade: (answer.created ?? []).some(
			(row) => row.kind === "account" && row.id === answer.account.id,
		),
		...(organization ? { organization } : {}),
		...(detectionNote ? { detectionNote } : {}),
		shares: (answer.shares ?? []).map((share) => ({
			id: receiverKey(share.receiver),
			label: receiverLabel(share.receiver),
			existing: share.existing === true,
		})),
		shareFailures: [],
	};
}

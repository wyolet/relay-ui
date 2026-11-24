import type { PointerFields } from "@/pseudo/pointerField";
import type { Refusal } from "@/pseudo/refusal";

/** The form field a part of the `POST /pseudo-host-keys` body comes from. */
export type ByokRefusalField =
	| "hostId"
	| "ownerKind"
	| "secret"
	| "accountId"
	| "keyName"
	| "tierPolicyId"
	| "receiverKeys";

/** `/spec/account` is the new account: the account select offers it, so its refusals show there. */
export const BYOK_POINTER_FIELDS: PointerFields<ByokRefusalField> = {
	"/metadata/owner": "ownerKind",
	"/metadata": "keyName",
	"/spec/hostId": "hostId",
	"/spec/value": "secret",
	"/spec/accountId": "accountId",
	"/spec/account": "accountId",
	"/spec/tierPolicyId": "tierPolicyId",
	"/spec/shareWith": "receiverKeys",
};

export type ByokRefusal = Refusal<ByokRefusalField>;

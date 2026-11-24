import type { PointerFields } from "@/pseudo/pointerField";
import type { Refusal } from "@/pseudo/refusal";

/** The form field a part of the `POST /pseudo-agents` body comes from; `owner` is the owner pick, `access` the access step as a whole. */
export type RefusalField =
	| "displayName"
	| "owner"
	| "accountIds"
	| "poolIds"
	| "access"
	| "policyId"
	| "keyName";

export const AGENT_POINTER_FIELDS: PointerFields<RefusalField> = {
	"/metadata/owner": "owner",
	"/metadata": "displayName",
	"/spec/access/accountIds": "accountIds",
	"/spec/access/poolIds": "poolIds",
	"/spec/access": "access",
	"/spec/policyId": "policyId",
	"/spec/key": "keyName",
};

export type AgentRefusal = Refusal<RefusalField>;

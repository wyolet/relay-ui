import type { PointerFields } from "@/pseudo/pointerField";

/** The form field a part of the `POST /pseudo-limits` body comes from. */
export type LimitRefusalField =
	| "displayName"
	| "amountUsd"
	| "rateAmount"
	| "perAccount"
	| "models";

export const LIMIT_POINTER_FIELDS: PointerFields<LimitRefusalField> = {
	"/metadata": "displayName",
	"/spec/budget": "amountUsd",
	"/spec/rateLimit": "rateAmount",
	"/spec/link/shared": "perAccount",
	"/spec/link/models": "models",
};

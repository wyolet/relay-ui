import type { PointerFields } from "@/pseudo/pointerField";

/** The form field a part of the `POST /pseudo-limits` body comes from. */
export type LimitRefusalField = "displayName" | "amountUsd" | "rateAmount";

export const LIMIT_POINTER_FIELDS: PointerFields<LimitRefusalField> = {
	"/metadata": "displayName",
	"/spec/budget": "amountUsd",
	"/spec/rateLimit": "rateAmount",
};

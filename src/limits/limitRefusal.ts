import { PseudoRefusal } from "@/api/types/errors";
import type { PointerFields } from "@/pseudo/pointerField";

/** The form field a part of the `POST /pseudo-limits` body comes from. */
export type LimitRefusalField = "displayName" | "amountUsd" | "rateAmount";

export const LIMIT_POINTER_FIELDS: PointerFields<LimitRefusalField> = {
	"/metadata": "displayName",
	"/spec/budget": "amountUsd",
	"/spec/rateLimit": "rateAmount",
};

/** The target's policy is set by a scope above the caller, who may not see or change it. */
export function isPolicySetAbove(err: unknown): boolean {
	return err instanceof PseudoRefusal && err.body.code === "policy_set_above";
}

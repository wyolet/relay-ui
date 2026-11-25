import type { OwnerLimits } from "@/agents/agentOwner";
import { serviceAccountOwnerKinds } from "@/api/runtimeConfig";
import type { PersonalAccountEffective } from "@/lib/personalAccount";

/** The owner cards' limits as relay's config and the caller's own personal account state them. */
export function agentOwnerLimits(
	personalAccount: PersonalAccountEffective | undefined,
): OwnerLimits {
	return {
		servedKinds: serviceAccountOwnerKinds(),
		personalOff: personalAccount?.state === "off",
	};
}

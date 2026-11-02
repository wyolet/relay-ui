import type { AccountKind } from "@/accounts/accountView";
import {
	hasLimitsView,
	type LimitsState,
	toLimitsState,
} from "@/accounts/limitsView";
import { useAccountLimits } from "@/api/hooks/accounts";
import { useKeyLimits } from "@/api/hooks/keys";

export function useAccountEffectiveLimits(
	name: string,
	kind: AccountKind,
): LimitsState {
	const enabled = hasLimitsView(kind);
	const { data, isError } = useAccountLimits(name, enabled);
	return toLimitsState({ data, isError, enabled });
}

/** The limits of the key's default lane. */
export function useKeyEffectiveLimits(name: string): LimitsState {
	const { data, isError } = useKeyLimits(name);
	return toLimitsState({ data, isError, enabled: true });
}
